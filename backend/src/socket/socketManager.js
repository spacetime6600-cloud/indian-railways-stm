const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

let io = null;

// ── Room helpers ──────────────────────────────────────────────────────────────
const STATION_SCOPED = new Set(['station_master', 'dispatcher']);
const ZONE_SCOPED    = new Set(['zone_admin']);

function getRoomForUser(user) {
  if (STATION_SCOPED.has(user.role) && user.assigned_station)
    return 'station_' + user.assigned_station.toLowerCase().replace(/\s+/g, '_');
  if (ZONE_SCOPED.has(user.role) && user.assigned_zone)
    return 'zone_' + user.assigned_zone.toLowerCase().replace(/\s+/g, '_');
  return 'national';
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init(httpServer) {
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT handshake middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { rows } = await pool.query(
        'SELECT id, full_name, email, role, assigned_station, assigned_zone FROM users WHERE id = $1',
        [decoded.id]
      );
      if (!rows.length) return next(new Error('User not found'));
      socket.user = rows[0];
      next();
    } catch (err) {
      next(new Error('Auth failed: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const room = getRoomForUser(socket.user);
    socket.join(room);
    // National-scope users also join 'national' (already done above for most)
    // Station/zone users additionally join 'national' for broadcast events
    if (room !== 'national') socket.join('national');

    socket.on('disconnect', () => {
      // Socket.IO handles room cleanup automatically
    });
  });

  console.log('🔌 Socket.IO server initialised');
  return io;
}

function getIO() { return io; }

// ── Emit helpers ──────────────────────────────────────────────────────────────
function emitTrainUpdate(trainRow) {
  if (!io) return;
  io.emit('train:updated', {
    id:               trainRow.id,
    status:           trainRow.status,
    speed:            trainRow.speed,
    delay_minutes:    trainRow.delay_minutes,
    current_location: trainRow.current_location,
    updated_at:       trainRow.updated_at,
  });
}

function emitAlertNew(alertRow) {
  if (!io) return;
  const payload = {
    id:           alertRow.id,
    type:         alertRow.type,
    severity:     alertRow.severity,
    title:        alertRow.title,
    message:      alertRow.message,
    station_name: alertRow.station_name || null,
    created_at:   alertRow.created_at,
    priority_level: alertRow.priority_level || null,
  };
  // Broadcast to national room (all high-privilege users)
  io.to('national').emit('alert:new', payload);
  // Also broadcast to the specific station room if tagged
  if (alertRow.station_name) {
    const stationRoom = 'station_' + alertRow.station_name.toLowerCase().replace(/\s+/g, '_');
    io.to(stationRoom).emit('alert:new', payload);
  }
}

function emitAlertResolved(id) {
  if (!io) return;
  io.emit('alert:resolved', { id });
}

function emitPlatformUpdate(platformRow) {
  if (!io) return;
  io.emit('platform:updated', {
    id:             platformRow.id,
    platform_number:platformRow.platform_number,
    station_name:   platformRow.station_name,
    occupied:       platformRow.occupied,
    status:         platformRow.status,
    train_number:   platformRow.train_number || null,
  });
}

function emitStatsRefresh() {
  if (!io) return;
  io.emit('stats:refresh');
}

module.exports = { init, getIO, emitTrainUpdate, emitAlertNew, emitAlertResolved, emitPlatformUpdate, emitStatsRefresh };
