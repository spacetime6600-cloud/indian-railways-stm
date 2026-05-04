'use strict';
const pool = require('../config/db');
const sm   = require('../socket/socketManager');
const { writeAudit } = require('../utils/audit');

// ── Param placeholder helper ──────────────────────────────────────────────────
const p = (n) => `$${n}`;

// ── GET /api/trains ───────────────────────────────────────────────────────────
const getTrains = async (req, res) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset  = (page - 1) * limit;
    const search  = (req.query.search  || '').trim();
    const status  = (req.query.status  || '').trim().toLowerCase();
    const zone    = (req.query.zone    || '').trim();
    const type    = (req.query.type    || '').trim();
    const sortBy  = ['train_number','train_name','status','delay_minutes','speed','zone'].includes(req.query.sortBy)
                    ? req.query.sortBy : 'train_number';
    const sortDir = req.query.sortDir === 'desc' ? 'DESC' : 'ASC';

    const conds = [], params = [];
    let idx = 1;
    const scope = req.scope || { type: 'national' };

    if (scope.type === 'station') {
      conds.push(`(t.source ILIKE ${p(idx)} OR t.destination ILIKE ${p(idx)} OR t.current_location ILIKE ${p(idx)})`);
      params.push('%' + scope.station + '%'); idx++;
    } else if (scope.type === 'zone') {
      conds.push(`t.zone = ${p(idx++)}`); params.push(scope.zone);
    }
    if (search) {
      const s = p(idx);
      conds.push(`(t.train_number ILIKE ${s} OR t.train_name ILIKE ${s} OR t.route ILIKE ${s} OR t.source ILIKE ${s} OR t.destination ILIKE ${s} OR t.current_location ILIKE ${s})`);
      params.push('%' + search + '%'); idx++;
    }
    if (status) { conds.push(`t.status = ${p(idx++)}`); params.push(status); }
    if (zone && scope.type === 'national') { conds.push(`t.zone = ${p(idx++)}`); params.push(zone); }
    if (type)  { conds.push(`t.train_type = ${p(idx++)}`); params.push(type); }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [cnt, data] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM trains t ${where}`, params),
      pool.query(
        `SELECT t.id,t.train_number,t.train_name,t.route,t.source,t.destination,
                t.current_location,t.zone,t.train_type,t.speed,t.eta,t.delay_minutes,
                t.status,t.predicted_delay,t.risk_scores,t.created_at,t.updated_at,
                p.platform_number,p.station_name
         FROM trains t
         LEFT JOIN platforms p ON t.assigned_platform_id = p.id
         ${where}
         ORDER BY t.${sortBy} ${sortDir}
         LIMIT ${p(idx)} OFFSET ${p(idx + 1)}`,
        [...params, limit, offset]
      ),
    ]);
    const total = parseInt(cnt.rows[0].count);
    res.json({ data: data.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { res.status(500).json({ message: e.message }); }
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
    const train = r.rows[0];

    // ── AI delay prediction (non-blocking, fire-and-forget) ──────────────────
    const toTrainType = (t) => {
      const l = (t || '').toLowerCase();
      if (l.includes('freight') || l.includes('goods') || l.includes('coal')) return 'freight';
      if (l.includes('passenger') || l.includes('memu') || l.includes('demu') || l.includes('local')) return 'passenger';
      return 'express';
    };
    (async () => {
      try {
        const ML_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
        const mlRes = await fetch(`${ML_URL}/predict-delay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distance:         500,
            weather:          'clear',
            congestion_level: 'Medium',
            previous_delay:   train.delay_minutes ?? 0,
            train_type:       toTrainType(train.train_type),
          }),
          signal: AbortSignal.timeout(3000),
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          const predicted = parseFloat((mlData.delay_minutes ?? 0).toFixed(2));
          await pool.query('UPDATE trains SET predicted_delay=$1 WHERE id=$2', [predicted, train.id]);
          // Emit updated train with AI prediction
          const io = sm.getIO();
          if (io) io.emit('train:ai_updated', { id: train.id, predicted_delay: predicted });
        }
      } catch (_) { /* ML offline — non-blocking */ }
    })();

    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'UPDATE', entityType: 'train', entityId: train.id, oldValue: old.rows[0], newValue: train });
    sm.emitTrainUpdate(train);
    sm.emitStatsRefresh();
    res.json(train);
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
