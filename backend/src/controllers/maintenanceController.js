'use strict';
const pool = require('../config/db');
const sm   = require('../socket/socketManager');
const { writeAudit } = require('../utils/audit');

// ── GET /api/maintenance ──────────────────────────────────────────────────────
const getMaintenance = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM maintenance ORDER BY next_service_date ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/maintenance ─────────────────────────────────────────────────────
const createMaintenance = async (req, res) => {
  try {
    const { assetType, assetId, condition, riskLevel, nextServiceDate, notes, status } = req.body;
    if (!assetType || !assetId || !condition || !riskLevel || !nextServiceDate)
      return res.status(400).json({ message: 'assetType, assetId, condition, riskLevel, nextServiceDate are required' });

    const result = await pool.query(
      `INSERT INTO maintenance (asset_type, asset_id, condition, risk_level, next_service_date, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [assetType, assetId, condition, riskLevel, nextServiceDate, notes || null, status || 'scheduled']
    );
    const record = result.rows[0];

    // ── AI risk prediction (non-blocking) ────────────────────────────────────
    (async () => {
      try {
        const ML_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
        const faultScore = condition === 'critical' ? 3 : condition === 'poor' ? 2 : condition === 'fair' ? 1 : 0;
        const mlRes = await fetch(`${ML_URL}/predict-maintenance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temperature: 80, vibration: 5, usage_hours: 1000, last_service_days: 30, fault_history: faultScore }),
          signal: AbortSignal.timeout(3000),
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          await pool.query('UPDATE maintenance SET risk_score=$1, ai_status=$2 WHERE id=$3', [mlData.risk_score, mlData.status, record.id]);
          const io = sm.getIO();
          if (io) io.emit('maintenance:ai_updated', { id: record.id, risk_score: mlData.risk_score, ai_status: mlData.status });
        }
      } catch (_) {}
    })();

    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'CREATE', entityType: 'maintenance', entityId: record.id, newValue: record });
    const io = sm.getIO();
    if (io) io.emit('maintenance:created', record);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── PUT /api/maintenance/:id ──────────────────────────────────────────────────
const updateMaintenance = async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM maintenance WHERE id=$1', [req.params.id]);
    if (!old.rows.length) return res.status(404).json({ message: 'Maintenance record not found' });

    const { condition, riskLevel, nextServiceDate, notes, status, assetType, assetId } = req.body;
    const result = await pool.query(
      `UPDATE maintenance SET
         asset_type        = COALESCE($1, asset_type),
         asset_id          = COALESCE($2, asset_id),
         condition         = COALESCE($3, condition),
         risk_level        = COALESCE($4, risk_level),
         next_service_date = COALESCE($5, next_service_date),
         notes             = COALESCE($6, notes),
         status            = COALESCE($7, status),
         updated_at        = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [assetType, assetId, condition, riskLevel, nextServiceDate, notes, status, req.params.id]
    );
    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'UPDATE', entityType: 'maintenance', entityId: req.params.id, oldValue: old.rows[0], newValue: result.rows[0] });

    const io = sm.getIO();
    if (io) io.emit('maintenance:updated', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── DELETE /api/maintenance/:id ───────────────────────────────────────────────
const deleteMaintenance = async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM maintenance WHERE id=$1', [req.params.id]);
    if (!old.rows.length) return res.status(404).json({ message: 'Maintenance record not found' });

    await pool.query('DELETE FROM maintenance WHERE id=$1', [req.params.id]);
    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'DELETE', entityType: 'maintenance', entityId: req.params.id, oldValue: old.rows[0] });

    const io = sm.getIO();
    if (io) io.emit('maintenance:deleted', { id: req.params.id });
    res.json({ message: 'Maintenance record deleted', id: req.params.id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { getMaintenance, createMaintenance, updateMaintenance, deleteMaintenance };
