// ── Role hierarchy ────────────────────────────────────────────────────────────
// admin > national_controller > zone_admin > station_master > dispatcher > analyst > viewer
const ROLE_RANK = {
  admin:                6,
  national_controller:  5,
  zone_admin:           4,
  station_master:       3,
  traffic_controller:   3,
  dispatcher:           2,
  engineer:             2,
  analyst:              1,
  viewer:               0,
};

// Roles that are scoped to a single station
const STATION_SCOPED_ROLES = new Set(['station_master', 'dispatcher']);

// Roles that are scoped to a zone
const ZONE_SCOPED_ROLES = new Set(['zone_admin']);

// ── authorize(...roles) ───────────────────────────────────────────────────────
// Allows access if user's role is in the list OR user is admin
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'admin') return next(); // admin bypasses all
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({
    message: `Role '${req.user.role}' is not authorized for this action`,
  });
};

// ── stationScope ──────────────────────────────────────────────────────────────
// Attaches scope info to req so controllers can filter queries
// req.scope = { type: 'national' | 'zone' | 'station', station, zone }
const stationScope = (req, res, next) => {
  const { role, assigned_station, assigned_zone } = req.user;

  if (STATION_SCOPED_ROLES.has(role)) {
    if (!assigned_station) {
      return res.status(403).json({ message: 'No station assigned to this account. Contact admin.' });
    }
    req.scope = { type: 'station', station: assigned_station, zone: assigned_zone };
  } else if (ZONE_SCOPED_ROLES.has(role)) {
    if (!assigned_zone) {
      return res.status(403).json({ message: 'No zone assigned to this account. Contact admin.' });
    }
    req.scope = { type: 'zone', station: null, zone: assigned_zone };
  } else {
    // admin, national_controller, analyst, engineer — national view
    req.scope = { type: 'national', station: null, zone: null };
  }

  next();
};

module.exports = { authorize, stationScope, STATION_SCOPED_ROLES, ZONE_SCOPED_ROLES };
