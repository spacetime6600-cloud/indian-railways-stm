const express = require('express');
const router  = express.Router();
const { getUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { protect }     = require('../middlewares/authMiddleware');
const { authorize }   = require('../middlewares/roleMiddleware');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'national_controller'), getUsers);

router.route('/:id')
  .get(authorize('admin', 'national_controller'), getUserById)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;
