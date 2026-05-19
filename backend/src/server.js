require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const cacheMiddleware = require('./middlewares/cacheMiddleware');
const socketManager = require('./socket/socketManager');

// ── Production guard ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set in production. Exiting.');
  process.exit(1);
}

// Connect to Database
require('./config/db');

const app = express();

// ── Security Middlewares ──────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = process.env.CLIENT_URLS.split(",");

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked: " + origin));
    }
  },
  credentials: true
}));

app.options('*', cors());

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 50,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
});
app.use('/api/', limiter);

// ── Logging & Body Parser ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── Cache headers ─────────────────────────────────────────────────────────────
app.use(cacheMiddleware);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Indian Railways STM API', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/trains', require('./routes/trainRoutes'));
app.use('/api/platforms', require('./routes/platformRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── HTTP Server + Socket.IO ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
socketManager.init(httpServer);

httpServer.listen(PORT, () => {
  console.log('🚂 Indian Railways STM API running on port ' + PORT + ' [' + (process.env.NODE_ENV || 'development') + ']');
});

module.exports = app; // Trigger restart
