const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const VALID_ROLES = [
  'admin', 'national_controller', 'zone_admin',
  'station_master', 'traffic_controller', 'dispatcher',
  'engineer', 'analyst', 'viewer',
];

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitize = (str) => (typeof str === 'string' ? str.trim() : '');

// Build the public user object returned on login/profile
const buildUserPayload = (u, token) => ({
  _id:             u.id,
  fullName:        u.full_name,
  email:           u.email,
  role:            u.role,
  assignedStation: u.assigned_station || null,
  assignedZone:    u.assigned_zone    || null,
  // Derived permissions sent to frontend
  permissions:     derivePermissions(u.role),
  token,
});

// ── Permission map ────────────────────────────────────────────────────────────
const derivePermissions = (role) => {
  const base = {
    viewDashboard:    true,
    viewTrains:       true,
    viewPlatforms:    true,
    viewAlerts:       true,
    viewAnalytics:    true,
    viewMaintenance:  false,
    viewSettings:     false,
    viewAllStations:  false,
    viewZoneDashboard:false,
    viewNationalDash: false,
    manageTrains:     false,
    manageUsers:      false,
    resolveAlerts:    false,
  };

  switch (role) {
    case 'admin':
      return { ...base, viewMaintenance:true, viewSettings:true, viewAllStations:true, viewNationalDash:true, viewZoneDashboard:true, manageTrains:true, manageUsers:true, resolveAlerts:true };
    case 'national_controller':
      return { ...base, viewAllStations:true, viewNationalDash:true, viewZoneDashboard:true, manageTrains:true, resolveAlerts:true, viewMaintenance:true };
    case 'zone_admin':
      return { ...base, viewZoneDashboard:true, viewAllStations:true, manageTrains:true, resolveAlerts:true, viewMaintenance:true };
    case 'station_master':
      return { ...base, resolveAlerts:true, manageTrains:true, viewSettings:false };
    case 'traffic_controller':
      return { ...base, resolveAlerts:true, manageTrains:true };
    case 'dispatcher':
      return { ...base, manageTrains:true, resolveAlerts:true };
    case 'engineer':
      return { ...base, viewMaintenance:true };
    case 'analyst':
      return { ...base, viewAllStations:true, viewNationalDash:true };
    default:
      return base;
  }
};

// ── Register ──────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const fullName        = sanitize(req.body.fullName);
    const email           = sanitize(req.body.email).toLowerCase();
    const password        = sanitize(req.body.password);
    const role            = sanitize(req.body.role) || 'traffic_controller';
    const assignedStation = sanitize(req.body.assignedStation) || null;
    const assignedZone    = sanitize(req.body.assignedZone)    || null;

    if (!fullName || !email || !password)
      return res.status(400).json({ message: 'fullName, email and password are required' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, assigned_station, assigned_zone)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, full_name, email, role, assigned_station, assigned_zone`,
      [fullName, email, hash, role, assignedStation, assignedZone]
    );

    res.status(201).json(buildUserPayload(result.rows[0], generateToken(result.rows[0].id)));
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  try {
    const email    = sanitize(req.body.email).toLowerCase();
    const password = sanitize(req.body.password);

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user   = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: 'Invalid email or password' });

    if (user.status === 'suspended')
      return res.status(403).json({ message: 'Account suspended. Contact administrator.' });

    res.json(buildUserPayload(user, generateToken(user.id)));
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Profile GET ───────────────────────────────────────────────────────────────
const getUserProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, full_name, email, role, assigned_station, assigned_zone, status FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(buildUserPayload(rows[0], null));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Profile PUT ───────────────────────────────────────────────────────────────
const updateUserProfile = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const fullName = sanitize(req.body.fullName) || user.full_name;
    const email    = sanitize(req.body.email).toLowerCase() || user.email;
    let   hash     = user.password_hash;

    if (req.body.password) {
      const p = sanitize(req.body.password);
      if (p.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
      hash = await bcrypt.hash(p, await bcrypt.genSalt(12));
    }

    const updated = await pool.query(
      `UPDATE users SET full_name=$1, email=$2, password_hash=$3, updated_at=CURRENT_TIMESTAMP
       WHERE id=$4 RETURNING id, full_name, email, role, assigned_station, assigned_zone`,
      [fullName, email, hash, req.user.id]
    );
    res.json(buildUserPayload(updated.rows[0], generateToken(updated.rows[0].id)));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const logoutUser = (req, res) => res.json({ message: 'Logged out successfully' });

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile, logoutUser };
