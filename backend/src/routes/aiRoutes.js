const express = require('express');
const router  = express.Router();
const {
  getHealth,
  predictDelay,
  predictCongestion,
  predictAlert,
  predictMaintenance,
  networkSnapshot,
  trainInsights,
} = require('../controllers/aiController');
const { protect }     = require('../middlewares/authMiddleware');
const { authorize }   = require('../middlewares/roleMiddleware');

// All AI routes require authentication
router.use(protect);

// Health check — any authenticated user
router.get('/health', getHealth);

// Network snapshot — any authenticated user (used by dashboard)
router.get('/network-snapshot', networkSnapshot);

// Per-train insights
router.get('/train/:id/insights', trainInsights);

// Individual prediction endpoints — traffic controllers and above
const canPredict = authorize('admin','national_controller','zone_admin','station_master','traffic_controller','dispatcher','engineer','analyst');
router.post('/predict-delay',       canPredict, predictDelay);
router.post('/predict-congestion',  canPredict, predictCongestion);
router.post('/predict-alert',       canPredict, predictAlert);
router.post('/predict-maintenance', canPredict, predictMaintenance);

module.exports = router;
