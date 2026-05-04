const express = require('express');
const router  = express.Router();
const { getOverview, getDelays, getPlatformUsage, getPerformance, getZoneStats } = require('../controllers/analyticsController');
const { protect }      = require('../middlewares/authMiddleware');
const { stationScope } = require('../middlewares/roleMiddleware');

router.use(protect);
router.use(stationScope);

router.get('/overview',       getOverview);
router.get('/delays',         getDelays);
router.get('/platform-usage', getPlatformUsage);
router.get('/performance',    getPerformance);
router.get('/zones',          getZoneStats);

module.exports = router;
