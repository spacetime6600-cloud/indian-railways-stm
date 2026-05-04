const express = require('express');
const router  = express.Router();
const { getAlerts, createAlert, resolveAlert, deleteAlert } = require('../controllers/alertController');
const { protect }                = require('../middlewares/authMiddleware');
const { authorize, stationScope } = require('../middlewares/roleMiddleware');

router.use(protect);
router.use(stationScope);

router.route('/')
  .get(getAlerts)
  .post(authorize('admin','national_controller','zone_admin','station_master','traffic_controller','dispatcher'), createAlert);

router.route('/:id/resolve')
  .put(authorize('admin','national_controller','zone_admin','station_master','traffic_controller','dispatcher'), resolveAlert);

router.route('/:id')
  .delete(authorize('admin','national_controller'), deleteAlert);

module.exports = router;
