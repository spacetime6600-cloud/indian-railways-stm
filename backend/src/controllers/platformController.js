'use strict';
const pool = require('../config/db');
const sm   = require('../socket/socketManager');
const { writeAudit } = require('../utils/audit');

// ── GET /api/platforms ────────────────────────────────────────────────────────
const getPlatforms = async (req, res) => {
  try {
    const scope = req.scope || { type: 'national' };
    let where = '';
    const params = [];
    if (scope.type === 'station') {
      where = `WHERE p.station_name ILIKE $1`;
      params.push(`%${scope.station}%`);
    }
    const result = await pool.query(
      `SELECT p.*, t.train_number, t.train_name, t.route, t.source, t.destination,
              t.status as train_status, t.delay_minutes, t.train_type, t.zone
       FROM platforms p
       LEFT JOIN trains t ON p.assigned_train_id = t.id
       ${where}
       ORDER BY p.station_name, p.platform_number`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/platforms ───────────────────────────────────────────────────────
const createPlatform = async (req, res) => {
  try {
    const { platformNumber, stationName, occupied, status, demandForecasts } = req.body;
    if (!platformNumber || !stationName)
      return res.status(400).json({ message: 'platformNumber and stationName are required' });

    const scope = req.scope || { type: 'national' };
    if (scope.type === 'station' && !stationName.toLowerCase().includes(scope.station.toLowerCase()))
      return res.status(403).json({ message: `You can only manage platforms for ${scope.station}` });

    const result = await pool.query(
      `INSERT INTO platforms (platform_number, station_name, occupied, status, demand_forecasts)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [platformNumber, stationName, occupied || false, status || 'active', demandForecasts || 0]
    );
    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'CREATE', entityType: 'platform', entityId: result.rows[0].id, newValue: result.rows[0] });
    sm.emitPlatformUpdate(result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Platform already exists at this station' });
    res.status(400).json({ message: error.message });
  }
};

// ── PUT /api/platforms/:id ────────────────────────────────────────────────────
// Supports atomic platform reassignment with ACID transaction
const updatePlatform = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the row to prevent concurrent reassignment
    const old = await client.query('SELECT * FROM platforms WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!old.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Platform not found' }); }

    const { stationName, occupied, status, assignedTrainId } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (stationName !== undefined)     { fields.push(`station_name = $${idx++}`);      values.push(stationName); }
    if (occupied !== undefined)        { fields.push(`occupied = $${idx++}`);           values.push(occupied); }
    if (status !== undefined)          { fields.push(`status = $${idx++}`);             values.push(status); }
    if (assignedTrainId !== undefined) { fields.push(`assigned_train_id = $${idx++}`); values.push(assignedTrainId || null); }
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 1) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'No fields to update' }); }

    values.push(req.params.id);
    const result = await client.query(
      `UPDATE platforms SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    // If assigning a new train, also update the train's assigned_platform_id
    if (assignedTrainId !== undefined) {
      if (assignedTrainId) {
        await client.query('UPDATE trains SET assigned_platform_id=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [req.params.id, assignedTrainId]);
      } else if (old.rows[0].assigned_train_id) {
        // Clearing assignment — free the train's platform reference too
        await client.query('UPDATE trains SET assigned_platform_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=$1', [old.rows[0].assigned_train_id]);
      }
    }

    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'UPDATE', entityType: 'platform', entityId: req.params.id, oldValue: old.rows[0], newValue: result.rows[0], client });
    await client.query('COMMIT');

    sm.emitPlatformUpdate(result.rows[0]);
    sm.emitStatsRefresh();
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
};

// ── DELETE /api/platforms/:id ─────────────────────────────────────────────────
const deletePlatform = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const old = await client.query('SELECT * FROM platforms WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!old.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Platform not found' }); }

    // Free any train assigned to this platform
    if (old.rows[0].assigned_train_id) {
      await client.query('UPDATE trains SET assigned_platform_id=NULL WHERE id=$1', [old.rows[0].assigned_train_id]);
    }

    await client.query('DELETE FROM platforms WHERE id=$1', [req.params.id]);
    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'DELETE', entityType: 'platform', entityId: req.params.id, oldValue: old.rows[0], client });
    await client.query('COMMIT');

    const io = sm.getIO();
    if (io) io.emit('platform:deleted', { id: req.params.id });
    res.json({ message: 'Platform deleted', id: req.params.id });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: e.message });
  } finally {
    client.release();
  }
};

module.exports = { getPlatforms, createPlatform, updatePlatform, deletePlatform };
