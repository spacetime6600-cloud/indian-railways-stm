const express = require('express');
const router  = express.Router();
const { getPlatforms, createPlatform, updatePlatform, deletePlatform } = require('../controllers/platformController');
const { protect }                = require('../middlewares/authMiddleware');
const { authorize, stationScope } = require('../middlewares/roleMiddleware');

router.use(protect);
router.use(stationScope);

router.route('/')
  .get(getPlatforms)
  .post(authorize('admin','national_controller','zone_admin','station_master'), createPlatform);

router.route('/:id')
  .put(authorize('admin','national_controller','zone_admin','station_master','traffic_controller','dispatcher'), updatePlatform)
  .delete(authorize('admin','national_controller','zone_admin'), deletePlatform);

module.exports = router;
