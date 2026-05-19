const express = require('express');
const router  = express.Router();
const { getTrains, getTrainStats, getTrainById, createTrain, updateTrain, deleteTrain } = require('../controllers/trainController');
const { protect }                = require('../middlewares/authMiddleware');
const { authorize, stationScope } = require('../middlewares/roleMiddleware');

// Apply auth + scope to all train routes
router.use(protect);
router.use(stationScope);
router.get('/trains', protect, getTrains);

router.get('/stats', getTrainStats);

router.route('/')
  .get(getTrains)
  .post(authorize('admin','national_controller','zone_admin','station_master','traffic_controller','dispatcher'), createTrain);

router.route('/:id')
  .get(getTrainById)
  .put(authorize('admin','national_controller','zone_admin','station_master','traffic_controller','dispatcher'), updateTrain)
  .delete(authorize('admin','national_controller'), deleteTrain);

module.exports = router;
