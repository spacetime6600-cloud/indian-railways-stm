'use strict';
const pool = require('../config/db');
const sm = require('../socket/socketManager');
const { writeAudit } = require('../utils/audit');

// ── Param placeholder helper ──────────────────────────────────────────────────
const getTrains = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    // ✅ safe sorting
    const allowedSort = [
      'train_number',
      'train_name',
      'speed',
      'delay_minutes',
      'created_at'
    ];

    let sortBy = req.query.sortBy || 'created_at';
    let sortDir = req.query.sortDir === 'asc' || req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';

    if (!allowedSort.includes(sortBy)) {
      sortBy = 'created_at';
    }

    // Build filters dynamically
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status ? req.query.status.trim() : '';
    const zone = req.query.zone ? req.query.zone.trim() : '';
    const type = req.query.type ? req.query.type.trim() : '';

    const conds = [];
    const params = [];
    let idx = 1;

    if (search) {
      conds.push(`(train_number ILIKE $${idx} OR train_name ILIKE $${idx} OR route ILIKE $${idx} OR source ILIKE $${idx} OR destination ILIKE $${idx} OR current_location ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (status) {
      conds.push(`status = $${idx++}`);
      params.push(status.toLowerCase());
    }
    if (zone) {
      conds.push(`zone = $${idx++}`);
      params.push(zone);
    }
    if (type) {
      conds.push(`train_type = $${idx++}`);
      params.push(type);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [cnt, data] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM trains ${where}`, params),
      pool.query(
        `SELECT 
          id,
          train_number,
          train_name,
          route,
          source,
          destination,
          current_location,
          zone,
          train_type,
          speed,
          delay_minutes,
          status
         FROM trains ${where}
         ORDER BY ${sortBy} ${sortDir}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
    ]);

    const total = parseInt(cnt.rows[0].count);
    res.json({
      data: data.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error("🔥 TRAIN API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
// ── GET /api/trains/stats ─────────────────────────────────────────────────────
const getTrainStats = async (req, res) => {
  try {
    const scope = req.scope || { type: 'national' };
    let where = '', params = [];
    if (scope.type === 'station') {
      where = "WHERE (source ILIKE $1 OR destination ILIKE $1 OR current_location ILIKE $1)";
      params.push('%' + scope.station + '%');
    } else if (scope.type === 'zone') {
      where = "WHERE zone = $1"; params.push(scope.zone);
    }
    const r = await pool.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER(WHERE status='running')   AS running,
              COUNT(*) FILTER(WHERE status='delayed')   AS delayed,
              COUNT(*) FILTER(WHERE status='scheduled') AS scheduled,
              COUNT(*) FILTER(WHERE status='halted')    AS halted,
              ROUND(AVG(delay_minutes) FILTER(WHERE delay_minutes>0),1) AS avg_delay,
              ROUND(AVG(speed)         FILTER(WHERE speed>0),1)         AS avg_speed
       FROM trains ${where}`,
      params
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ── GET /api/trains/:id ───────────────────────────────────────────────────────
const getTrainById = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT t.*, p.platform_number, p.station_name
       FROM trains t LEFT JOIN platforms p ON t.assigned_platform_id = p.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Train not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ── POST /api/trains ──────────────────────────────────────────────────────────
const createTrain = async (req, res) => {
  try {
    const { trainNumber, trainName, route, source, destination, speed, assignedPlatformId, status, zone, trainType } = req.body;
    if (!trainNumber || !trainName || !route || !source || !destination)
      return res.status(400).json({ message: 'trainNumber, trainName, route, source, destination are required' });

    const scope = req.scope || { type: 'national' };
    if (scope.type === 'station') {
      const st = scope.station.toLowerCase();
      if (!source.toLowerCase().includes(st) && !destination.toLowerCase().includes(st))
        return res.status(403).json({ message: `You can only register trains for ${scope.station}` });
    }

    const r = await pool.query(
      `INSERT INTO trains (train_number,train_name,route,source,destination,speed,assigned_platform_id,status,zone,train_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [trainNumber, trainName, route, source, destination, speed || 0, assignedPlatformId || null, status || 'scheduled', zone || 'Northern', trainType || 'Express']
    );

    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'CREATE', entityType: 'train', entityId: r.rows[0].id, newValue: r.rows[0] });
    sm.emitStatsRefresh();
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ message: `Train number ${req.body.trainNumber} already exists` });
    res.status(400).json({ message: e.message });
  }
};

// ── PUT /api/trains/:id ───────────────────────────────────────────────────────
const updateTrain = async (req, res) => {
  try {
    // Fetch old value for audit
    const old = await pool.query('SELECT * FROM trains WHERE id=$1', [req.params.id]);
    if (!old.rows.length) return res.status(404).json({ message: 'Train not found' });

    const { trainName, status, delayMinutes, speed, assignedPlatformId, zone, trainType, currentLocation, route } = req.body;
    const r = await pool.query(
      `UPDATE trains SET
         train_name          = COALESCE($1,  train_name),
         status              = COALESCE($2,  status),
         delay_minutes       = COALESCE($3,  delay_minutes),
         speed               = COALESCE($4,  speed),
         assigned_platform_id= COALESCE($5,  assigned_platform_id),
         zone                = COALESCE($6,  zone),
         train_type          = COALESCE($7,  train_type),
         current_location    = COALESCE($8,  current_location),
         route               = COALESCE($9,  route),
         updated_at          = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [trainName, status, delayMinutes, speed, assignedPlatformId, zone, trainType, currentLocation, route, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Train not found' });

    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'UPDATE', entityType: 'train', entityId: r.rows[0].id, oldValue: old.rows[0], newValue: r.rows[0] });
    sm.emitTrainUpdate(r.rows[0]);
    sm.emitStatsRefresh();
    res.json(r.rows[0]);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

// ── DELETE /api/trains/:id ────────────────────────────────────────────────────
const deleteTrain = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const old = await client.query('SELECT * FROM trains WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!old.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Train not found' }); }

    // Free any platform assigned to this train
    await client.query('UPDATE platforms SET assigned_train_id=NULL, occupied=false WHERE assigned_train_id=$1', [req.params.id]);

    await client.query('DELETE FROM trains WHERE id=$1', [req.params.id]);
    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'DELETE', entityType: 'train', entityId: req.params.id, oldValue: old.rows[0], client });

    await client.query('COMMIT');
    sm.emitStatsRefresh();
    // Notify all clients that this train is gone
    const io = sm.getIO();
    if (io) io.emit('train:deleted', { id: req.params.id });
    res.json({ message: 'Train removed', id: req.params.id });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: e.message });
  } finally {
    client.release();
  }
};

module.exports = { getTrains, getTrainStats, getTrainById, createTrain, updateTrain, deleteTrain };
