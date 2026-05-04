'use strict';
const pool = require('../config/db');
const sm   = require('../socket/socketManager');
const { writeAudit } = require('../utils/audit');

// ── GET /api/alerts ───────────────────────────────────────────────────────────
const getAlerts = async (req, res) => {
  try {
    const scope = req.scope || { type: 'national' };
    const conditions = [];
    const params = [];
    let idx = 1;

    if (scope.type === 'station') {
      conditions.push(`(a.station_name ILIKE $${idx} OR t.source ILIKE $${idx} OR t.destination ILIKE $${idx})`);
      params.push(`%${scope.station}%`); idx++;
    } else if (scope.type === 'zone') {
      conditions.push(`t.zone = $${idx++}`);
      params.push(scope.zone);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT a.*,
              t.train_number, t.train_name, t.status as train_status,
              p.platform_number, p.station_name as platform_station
       FROM alerts a
       LEFT JOIN trains    t ON a.related_train_id    = t.id
       LEFT JOIN platforms p ON a.related_platform_id = p.id
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/alerts ──────────────────────────────────────────────────────────
const createAlert = async (req, res) => {
  try {
    const { type, severity, title, message, relatedTrainId, relatedPlatformId, stationName } = req.body;
    if (!type || !severity || !title || !message)
      return res.status(400).json({ message: 'type, severity, title, message are required' });

    const scope = req.scope || { type: 'national' };
    const station = scope.type === 'station' ? scope.station : (stationName || null);

    const result = await pool.query(
      `INSERT INTO alerts (type, severity, title, message, station_name, related_train_id, related_platform_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [type, severity, title, message, station, relatedTrainId || null, relatedPlatformId || null]
    );
    const alert = result.rows[0];

    // ── Auto-assign AI priority ──────────────────────────────────────────────
    let aiPriority = null;
    try {
      const ML_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const h = new Date().getHours();
      const isPeak = (h >= 7 && h <= 10) || (h >= 17 && h <= 20);

      // Map alert type to ML category
      const alertTypeMap = (t) => {
        const l = (t || '').toLowerCase();
        if (l.includes('signal') || l.includes('delay')) return 'signal_failure';
        if (l.includes('track') || l.includes('maintenance')) return 'track_fault';
        if (l.includes('engine') || l.includes('loco')) return 'engine_issue';
        if (l.includes('weather') || l.includes('fog') || l.includes('rain')) return 'weather_alert';
        return 'passenger_emergency';
      };

      const mlRes = await fetch(`${ML_URL}/predict-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type:      alertTypeMap(type),
          delay_impact:    5.0,
          safety_risk:     severity === 'critical' ? 0.9 : severity === 'high' ? 0.6 : 0.3,
          affected_trains: 5,
          route_busy:      1,
          peak_hour:       isPeak ? 1 : 0,
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (mlRes.ok) {
        const mlData = await mlRes.json();
        aiPriority = mlData.priority;
        await pool.query('UPDATE alerts SET priority_level=$1 WHERE id=$2', [aiPriority, alert.id]);
        alert.priority_level = aiPriority;
      }
    } catch (_) { /* ML offline — non-blocking */ }

    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'CREATE', entityType: 'alert', entityId: alert.id, newValue: alert });
    sm.emitAlertNew(alert);
    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── PUT /api/alerts/:id/resolve ───────────────────────────────────────────────
const resolveAlert = async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM alerts WHERE id=$1', [req.params.id]);
    if (!old.rows.length) return res.status(404).json({ message: 'Alert not found' });
    if (old.rows[0].resolved) return res.status(400).json({ message: 'Alert already resolved' });

    const result = await pool.query(
      `UPDATE alerts SET resolved=true, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'RESOLVE', entityType: 'alert', entityId: req.params.id, oldValue: old.rows[0], newValue: result.rows[0] });
    sm.emitAlertResolved(result.rows[0].id);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── DELETE /api/alerts/:id ────────────────────────────────────────────────────
const deleteAlert = async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM alerts WHERE id=$1', [req.params.id]);
    if (!old.rows.length) return res.status(404).json({ message: 'Alert not found' });

    await pool.query('DELETE FROM alerts WHERE id=$1', [req.params.id]);
    await writeAudit({ userId: req.user?.id, role: req.user?.role, action: 'DELETE', entityType: 'alert', entityId: req.params.id, oldValue: old.rows[0] });

    const io = sm.getIO();
    if (io) io.emit('alert:deleted', { id: req.params.id });
    res.json({ message: 'Alert deleted', id: req.params.id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { getAlerts, createAlert, resolveAlert, deleteAlert };
