const express = require('express');
const router  = express.Router();
const { getMaintenance, createMaintenance, updateMaintenance, deleteMaintenance } = require('../controllers/maintenanceController');
const { protect }      = require('../middlewares/authMiddleware');
const { authorize }    = require('../middlewares/roleMiddleware');

router.use(protect);

router.route('/')
  .get(getMaintenance)
  .post(authorize('admin','national_controller','zone_admin','engineer'), createMaintenance);

router.route('/:id')
  .put(authorize('admin','national_controller','zone_admin','engineer'), updateMaintenance)
  .delete(authorize('admin','national_controller'), deleteMaintenance);

module.exports = router;
