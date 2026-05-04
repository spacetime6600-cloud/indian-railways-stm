const pool   = require('../config/db');
const bcrypt = require('bcryptjs');

const VALID_ROLES = [
  'admin', 'national_controller', 'zone_admin',
  'station_master', 'traffic_controller', 'dispatcher',
  'engineer', 'analyst', 'viewer',
];

const sanitize = (str) => (typeof str === 'string' ? str.trim() : '');

// ── GET /api/users ────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = sanitize(req.query.search || '');
    const role   = sanitize(req.query.role   || '');

    const conds  = [];
    const params = [];
    let   idx    = 1;

    if (search) {
      conds.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (role) {
      conds.push(`role = $${idx++}`);
      params.push(role);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [cnt, data] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users ${where}`, params),
      pool.query(
        `SELECT id, full_name, email, role, assigned_station, assigned_zone, status, created_at, updated_at
         FROM users ${where}
         ORDER BY created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
    ]);

    const total = parseInt(cnt.rows[0].count);
    res.json({
      data: data.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── GET /api/users/:id ────────────────────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, full_name, email, role, assigned_station, assigned_zone, status, created_at, updated_at FROM users WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    const user = rows[0];

    const fullName        = sanitize(req.body.fullName)        || user.full_name;
    const email           = sanitize(req.body.email).toLowerCase() || user.email;
    const role            = sanitize(req.body.role)            || user.role;
    const assignedStation = req.body.assignedStation !== undefined
      ? (sanitize(req.body.assignedStation) || null)
      : user.assigned_station;
    const assignedZone    = req.body.assignedZone !== undefined
      ? (sanitize(req.body.assignedZone) || null)
      : user.assigned_zone;
    const status          = sanitize(req.body.status) || user.status;

    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    if (!['active', 'inactive', 'suspended'].includes(status))
      return res.status(400).json({ message: 'status must be active, inactive, or suspended' });

    // Only admin can change another user's role
    if (req.body.role && req.user.role !== 'admin' && req.user.id !== req.params.id)
      return res.status(403).json({ message: 'Only admins can change user roles' });

    let hash = user.password_hash;
    if (req.body.password) {
      const p = sanitize(req.body.password);
      if (p.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
      hash = await bcrypt.hash(p, await bcrypt.genSalt(12));
    }

    const updated = await pool.query(
      `UPDATE users
       SET full_name=$1, email=$2, password_hash=$3, role=$4,
           assigned_station=$5, assigned_zone=$6, status=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8
       RETURNING id, full_name, email, role, assigned_station, assigned_zone, status, updated_at`,
      [fullName, email, hash, role, assignedStation, assignedZone, status, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ message: 'Email already in use' });
    res.status(400).json({ message: e.message });
  }
};

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id)
      return res.status(400).json({ message: 'You cannot delete your own account' });

    const r = await pool.query('DELETE FROM users WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { getUsers, getUserById, updateUser, deleteUser };
