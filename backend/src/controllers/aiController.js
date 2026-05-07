'use strict';
/**
 * AI/ML Controller
 * Proxies to the Python FastAPI ML service with correct categorical values.
 *
 * Valid model inputs (from preprocess.py files):
 *   Delay:       train_type: express|passenger|freight
 *                weather: clear|rain|fog|storm
 *                congestion_level: Low|Medium|High
 *   Congestion:  time_of_day: morning|afternoon|evening|night
 *                route_type: urban|suburban|intercity
 *   Alert:       alert_type: signal_failure|track_fault|engine_issue|weather_alert|passenger_emergency
 *   Maintenance: all numeric (temperature, vibration, usage_hours, last_service_days, fault_history)
 */
const pool = require('../config/db');

const ML_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function mlPost(path, body) {
  const res = await fetch(`${ML_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ML ${res.status}: ${text}`);
  }
  return res.json();
}

async function mlGet(path) {
  const res = await fetch(`${ML_URL}${path}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`ML ${res.status}`);
  return res.json();
}

// ── Normalizers — map IR data to ML model categories ─────────────────────────

/** Map any train type string → express | passenger | freight */
function toTrainType(t) {
  if (!t) return 'express';
  const l = t.toLowerCase();
  if (l.includes('freight') || l.includes('goods') || l.includes('coal') ||
      l.includes('container') || l.includes('parcel') || l.includes('tanker')) return 'freight';
  if (l.includes('passenger') || l.includes('memu') || l.includes('demu') ||
      l.includes('local') || l.includes('suburban')) return 'passenger';
  return 'express';
}

/** Map any weather string → clear | rain | fog | storm */
function toWeather(w) {
  if (!w) return 'clear';
  const l = w.toLowerCase();
  if (l.includes('storm') || l.includes('cyclone') || l.includes('thunder')) return 'storm';
  if (l.includes('fog') || l.includes('mist') || l.includes('haze')) return 'fog';
  if (l.includes('rain') || l.includes('drizzle') || l.includes('shower')) return 'rain';
  return 'clear';
}

/** Map any congestion string → Low | Medium | High */
function toCongestion(c) {
  if (!c) return 'Low';
  const l = c.toLowerCase();
  if (l.includes('high') || l.includes('severe') || l.includes('heavy')) return 'High';
  if (l.includes('medium') || l.includes('moderate')) return 'Medium';
  return 'Low';
}

/** Current hour → morning | afternoon | evening | night */
function toTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/** Map zone/route → urban | suburban | intercity */
function toRouteType(zone) {
  if (!zone) return 'intercity';
  const l = zone.toLowerCase();
  if (l.includes('central') || l.includes('metro')) return 'urban';
  if (l.includes('eastern') || l.includes('suburban')) return 'suburban';
  return 'intercity';
}

/** Map alert type → signal_failure | track_fault | engine_issue | weather_alert | passenger_emergency */
function toAlertType(t) {
  if (!t) return 'signal_failure';
  const l = t.toLowerCase();
  if (l.includes('signal') || l.includes('delay')) return 'signal_failure';
  if (l.includes('track') || l.includes('maintenance') || l.includes('rail')) return 'track_fault';
  if (l.includes('engine') || l.includes('loco') || l.includes('mechanical')) return 'engine_issue';
  if (l.includes('weather') || l.includes('fog') || l.includes('rain') ||
      l.includes('flood') || l.includes('storm') || l.includes('cyclone')) return 'weather_alert';
  if (l.includes('passenger') || l.includes('rush') || l.includes('crowd') ||
      l.includes('emergency') || l.includes('medical')) return 'passenger_emergency';
  return 'signal_failure';
}

// ── GET /api/ai/health ────────────────────────────────────────────────────────
const getHealth = async (req, res) => {
  try {
    const data = await mlGet('/health');
    res.json({ ...data, ml_url: ML_URL });
  } catch (e) {
    res.status(503).json({ status: 'unavailable', message: e.message, ml_url: ML_URL });
  }
};

// ── POST /api/ai/predict-delay ────────────────────────────────────────────────
const predictDelay = async (req, res) => {
  try {
    const { trainId } = req.body;
    let trainRow = null;

    if (trainId) {
      const r = await pool.query('SELECT * FROM trains WHERE id=$1', [trainId]);
      if (r.rows.length) trainRow = r.rows[0];
    }

    const payload = {
      distance:         parseFloat(req.body.distance)         || 500,
      weather:          toWeather(req.body.weather),
      congestion_level: toCongestion(req.body.congestionLevel || req.body.congestion_level),
      previous_delay:   parseFloat(trainRow?.delay_minutes ?? req.body.previousDelay ?? 0),
      train_type:       toTrainType(trainRow?.train_type ?? req.body.trainType),
    };

    const result = await mlPost('/predict-delay', payload);
    res.json({ ...result, input: payload, train: trainRow ? { id: trainRow.id, number: trainRow.train_number, name: trainRow.train_name } : null });
  } catch (e) {
    res.status(502).json({ message: 'ML service error', detail: e.message });
  }
};

// ── POST /api/ai/predict-congestion ──────────────────────────────────────────
const predictCongestion = async (req, res) => {
  try {
    // Compute live density from DB if not provided
    let density = parseFloat(req.body.trainDensity);
    let load    = parseFloat(req.body.stationLoad);

    if (!density || !load) {
      const r = await pool.query(
        "SELECT COUNT(*) FILTER(WHERE status='running') AS running, COUNT(*) AS total FROM trains"
      );
      const row = r.rows[0];
      const pct = (parseInt(row.running) / Math.max(1, parseInt(row.total))) * 100;
      density = density || parseFloat(pct.toFixed(2));
      load    = load    || parseFloat((pct * 100).toFixed(1)); // scale to station_load range
    }

    const payload = {
      train_density: density,
      station_load:  load,
      time_of_day:   req.body.timeOfDay || toTimeOfDay(),
      route_type:    toRouteType(req.body.routeType || req.body.zone),
    };

    const result = await mlPost('/predict-congestion', payload);
    res.json({ ...result, input: payload });
  } catch (e) {
    res.status(502).json({ message: 'ML service error', detail: e.message });
  }
};

// ── POST /api/ai/predict-alert ────────────────────────────────────────────────
const predictAlert = async (req, res) => {
  try {
    // Enrich affected_trains from DB if not provided
    let affected = parseInt(req.body.affectedTrains);
    if (!affected) {
      const r = await pool.query("SELECT COUNT(*) FROM trains WHERE status='delayed'");
      affected = parseInt(r.rows[0].count) || 1;
    }

    const h = new Date().getHours();
    const isPeak = (h >= 7 && h <= 10) || (h >= 17 && h <= 20);

    const payload = {
      alert_type:      toAlertType(req.body.alertType || req.body.type),
      delay_impact:    parseFloat(req.body.delayImpact ?? req.body.delay_impact ?? 5.0),
      safety_risk:     parseFloat(req.body.safetyRisk  ?? req.body.safety_risk  ?? 0.3),
      affected_trains: affected,
      route_busy:      parseInt(req.body.routeBusy ?? req.body.route_busy ?? (affected > 500 ? 1 : 0)),
      peak_hour:       parseInt(req.body.peakHour  ?? req.body.peak_hour  ?? (isPeak ? 1 : 0)),
    };

    const result = await mlPost('/predict-alert', payload);
    res.json({ ...result, input: payload });
  } catch (e) {
    res.status(502).json({ message: 'ML service error', detail: e.message });
  }
};

// ── POST /api/ai/predict-maintenance ─────────────────────────────────────────
const predictMaintenance = async (req, res) => {
  try {
    const { maintenanceId } = req.body;
    let daysSince = 30, faultScore = 0;

    if (maintenanceId) {
      const r = await pool.query('SELECT * FROM maintenance WHERE id=$1', [maintenanceId]);
      if (r.rows.length) {
        const m = r.rows[0];
        daysSince  = m.updated_at ? Math.floor((Date.now() - new Date(m.updated_at).getTime()) / 86400000) : 30;
        faultScore = m.condition === 'critical' ? 3 : m.condition === 'poor' ? 2 : m.condition === 'fair' ? 1 : 0;
      }
    }

    const payload = {
      temperature:       parseFloat(req.body.temperature       ?? 80),
      vibration:         parseFloat(req.body.vibration         ?? 5),
      usage_hours:       parseFloat(req.body.usageHours        ?? req.body.usage_hours ?? 1000),
      last_service_days: parseInt(req.body.lastServiceDays     ?? req.body.last_service_days ?? daysSince),
      fault_history:     parseInt(req.body.faultHistory        ?? req.body.fault_history ?? faultScore),
    };

    const result = await mlPost('/predict-maintenance', payload);
    res.json({ ...result, input: payload });
  } catch (e) {
    res.status(502).json({ message: 'ML service error', detail: e.message });
  }
};

// ── GET /api/ai/network-snapshot ──────────────────────────────────────────────

/** Build a smart deterministic fallback when ML is offline — derived from real DB stats */
function buildFallback(total, running, delayed, avgDelay, density, isPeak) {
  // Delay fallback
  const delayMinutes = avgDelay > 0
    ? parseFloat(avgDelay.toFixed(1))
    : parseFloat((delayed / Math.max(1, total) * 12).toFixed(1));

  // Congestion fallback
  const congestion_level = density > 70 ? 'High' : density > 40 ? 'Medium' : 'Low';

  // Alert priority fallback
  const priority = delayed > 3000 ? 'Critical' : delayed > 1000 ? 'High' : activeAlerts > 10 ? 'Medium' : 'Low';

  // Maintenance risk fallback (0–100)
  const risk_score = Math.min(100, Math.round(30 + (delayed / Math.max(1, total)) * 50 + (isPeak ? 10 : 0)));
  const maint_status = risk_score > 75 ? 'Critical' : risk_score > 50 ? 'Warning' : 'Nominal';

  return { delayMinutes, congestion_level, priority, risk_score, maint_status };
}

// eslint-disable-next-line no-unused-vars — used in closure below
let activeAlerts = 0;

const networkSnapshot = async (req, res) => {
  try {
    const [trainStats, alertStats] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE status='running') AS running, COUNT(*) FILTER(WHERE status='delayed') AS delayed, ROUND(AVG(delay_minutes) FILTER(WHERE delay_minutes>0),1) AS avg_delay FROM trains"),
      pool.query("SELECT COUNT(*) FROM alerts WHERE resolved=false"),
    ]);

    const ts         = trainStats.rows[0];
    const total      = parseInt(ts.total)   || 1;
    const running    = parseInt(ts.running) || 0;
    const delayed    = parseInt(ts.delayed) || 0;
    const avgDelay   = parseFloat(ts.avg_delay) || 0;
    activeAlerts     = parseInt(alertStats.rows[0].count) || 0;
    const density    = (running / total) * 100;
    const isPeak     = (() => { const h = new Date().getHours(); return (h >= 7 && h <= 10) || (h >= 17 && h <= 20); })();

    const delayPayload = {
      distance:         800,
      weather:          'clear',
      congestion_level: density > 70 ? 'High' : density > 40 ? 'Medium' : 'Low',
      previous_delay:   avgDelay,
      train_type:       'express',
    };
    const congestionPayload = {
      train_density: parseFloat(density.toFixed(2)),
      station_load:  parseFloat((density * 100).toFixed(1)),
      time_of_day:   toTimeOfDay(),
      route_type:    'intercity',
    };
    const alertPayload = {
      alert_type:      delayed > 2000 ? 'signal_failure' : 'track_fault',
      delay_impact:    avgDelay,
      safety_risk:     delayed > 1000 ? 0.7 : 0.3,
      affected_trains: delayed,
      route_busy:      density > 60 ? 1 : 0,
      peak_hour:       isPeak ? 1 : 0,
    };
    const maintenancePayload = {
      temperature:       85,
      vibration:         6,
      usage_hours:       1200,
      last_service_days: 45,
      fault_history:     1,
    };

    const [delayR, congR, alertR, maintR] = await Promise.allSettled([
      mlPost('/predict-delay',       delayPayload),
      mlPost('/predict-congestion',  congestionPayload),
      mlPost('/predict-alert',       alertPayload),
      mlPost('/predict-maintenance', maintenancePayload),
    ]);

    // If all 4 ML calls failed → ML is offline; build smart DB-derived fallback
    const allFailed = [delayR, congR, alertR, maintR].every(r => r.status === 'rejected');
    if (allFailed) {
      const fb = buildFallback(total, running, delayed, avgDelay, density, isPeak);
      return res.json({
        timestamp:    new Date().toISOString(),
        source:       'db_fallback',
        db_stats:     { total, running, delayed, avgDelay, activeAlerts },
        delay:        { delay_minutes: fb.delayMinutes, xai: { confidence: null, top_features: [] } },
        congestion:   { congestion_level: fb.congestion_level, xai: { confidence: null, top_features: [] } },
        alert:        { priority: fb.priority, xai: { confidence: null, top_features: [] } },
        maintenance:  { risk_score: fb.risk_score, status: fb.maint_status, xai: { confidence: null, top_features: [] } },
      });
    }

    // Otherwise use ML results (partial fallback for any that failed)
    const safe = (r, fb) => r.status === 'fulfilled' ? r.value : { ...fb, xai: { confidence: null, top_features: [] } };
    const fbData = buildFallback(total, running, delayed, avgDelay, density, isPeak);

    res.json({
      timestamp:   new Date().toISOString(),
      source:      'ml',
      db_stats:    { total, running, delayed, avgDelay, activeAlerts },
      delay:       safe(delayR,  { delay_minutes: fbData.delayMinutes }),
      congestion:  safe(congR,   { congestion_level: fbData.congestion_level }),
      alert:       safe(alertR,  { priority: fbData.priority }),
      maintenance: safe(maintR,  { risk_score: fbData.risk_score, status: fbData.maint_status }),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── GET /api/ai/train/:id/insights ────────────────────────────────────────────
const trainInsights = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM trains WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Train not found' });
    const t = r.rows[0];

    const [delayR, maintR] = await Promise.allSettled([
      mlPost('/predict-delay', {
        distance:         500,
        weather:          'clear',
        congestion_level: 'Medium',
        previous_delay:   t.delay_minutes ?? 0,
        train_type:       toTrainType(t.train_type),
      }),
      mlPost('/predict-maintenance', {
        temperature:       80,
        vibration:         5,
        usage_hours:       800,
        last_service_days: 30,
        fault_history:     t.risk_scores > 50 ? 2 : 0,
      }),
    ]);

    const safe = (r, fb) => r.status === 'fulfilled' ? r.value : { error: r.reason?.message, ...fb };

    res.json({
      train:       { id: t.id, number: t.train_number, name: t.train_name, status: t.status, delay: t.delay_minutes },
      delay:       safe(delayR,  { delay_minutes: null }),
      maintenance: safe(maintR,  { risk_score: null, status: null }),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { getHealth, predictDelay, predictCongestion, predictAlert, predictMaintenance, networkSnapshot, trainInsights };
