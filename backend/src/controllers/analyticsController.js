const pool = require('../config/db');

const getOverview = async (req, res) => {
  try {
    const scope = req.scope || { type: 'national' };
    let where = '';
    const params = [];

    if (scope.type === 'station') {
      where = `WHERE (source ILIKE $1 OR destination ILIKE $1 OR current_location ILIKE $1)`;
      params.push(`%${scope.station}%`);
    } else if (scope.type === 'zone') {
      where = `WHERE zone = $1`;
      params.push(scope.zone);
    }

    const [totalRes, activeRes, delayedRes, alertsRes, avgRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM trains ${where}`, params),
      pool.query(`SELECT COUNT(*) FROM trains ${where ? where + " AND status = 'running'" : "WHERE status = 'running'"}`, params),
      pool.query(`SELECT COUNT(*) FROM trains ${where ? where + " AND status = 'delayed'" : "WHERE status = 'delayed'"}`, params),
      pool.query('SELECT COUNT(*) FROM alerts WHERE resolved = false'),
      pool.query(`SELECT ROUND(AVG(delay_minutes) FILTER (WHERE delay_minutes > 0),1) as avg_delay, ROUND(AVG(speed) FILTER (WHERE speed > 0),1) as avg_speed FROM trains ${where}`, params),
    ]);

    const totalTrains   = parseInt(totalRes.rows[0].count);
    const activeTrains  = parseInt(activeRes.rows[0].count);
    const delayedTrains = parseInt(delayedRes.rows[0].count);
    const activeAlerts  = parseInt(alertsRes.rows[0].count);
    const onTimeRate    = totalTrains ? Math.round(((totalTrains - delayedTrains) / totalTrains) * 100) : 100;

    res.json({
      totalTrains, activeTrains, delayedTrains, activeAlerts, onTimeRate,
      avgDelay: parseFloat(avgRes.rows[0].avg_delay) || 0,
      avgSpeed: parseFloat(avgRes.rows[0].avg_speed) || 0,
      scopeType:    scope.type,
      scopeStation: scope.station || null,
      scopeZone:    scope.zone    || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDelays = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM analytics ORDER BY date DESC LIMIT 7');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPlatformUsage = async (req, res) => {
  try {
    const result = await pool.query('SELECT date, platform_usage FROM analytics ORDER BY date DESC LIMIT 7');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPerformance = async (req, res) => {
  try {
     const result = await pool.query('SELECT date, on_time_rate, avg_delay FROM analytics ORDER BY date DESC LIMIT 7');
     res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const getZoneStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        zone,
        COUNT(*)                                                        AS total,
        COUNT(*) FILTER (WHERE status = 'running')                     AS running,
        COUNT(*) FILTER (WHERE status = 'delayed')                     AS delayed,
        COUNT(*) FILTER (WHERE status = 'halted')                      AS halted,
        COUNT(*) FILTER (WHERE status = 'scheduled')                   AS scheduled,
        ROUND(AVG(speed) FILTER (WHERE speed > 0), 1)                  AS avg_speed,
        ROUND(AVG(delay_minutes) FILTER (WHERE delay_minutes > 0), 1)  AS avg_delay
      FROM trains
      WHERE zone IS NOT NULL AND zone != ''
      GROUP BY zone
      ORDER BY total DESC
    `);

    const rows = result.rows.map(r => {
      const total   = parseInt(r.total)   || 0;
      const delayed = parseInt(r.delayed) || 0;
      const running = parseInt(r.running) || 0;
      const pct     = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100;
      return {
        zone:      r.zone,
        total,
        running,
        delayed,
        halted:    parseInt(r.halted)    || 0,
        scheduled: parseInt(r.scheduled) || 0,
        avgSpeed:  parseFloat(r.avg_speed) || 0,
        avgDelay:  parseFloat(r.avg_delay) || 0,
        pct,
      };
    });

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOverview,
  getDelays,
  getPlatformUsage,
  getPerformance,
  getZoneStats,
};
