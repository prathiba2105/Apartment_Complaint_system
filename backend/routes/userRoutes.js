const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const userController = require('../controllers/userController');

router.get('/profile', protect, authorize('USER'), userController.getProfile);
router.put('/profile', protect, authorize('USER'), userController.updateProfile);
router.patch('/password', protect, authorize('USER'), userController.changePassword);
router.get('/dashboard', protect, authorize('USER'), userController.getDashboard);
router.get('/complaints', protect, authorize('USER'), userController.getComplaints);
router.get('/notifications', protect, authorize('USER'), userController.getNotifications);
router.patch(
  '/notifications/:id/read',
  protect,
  authorize('USER'),
  userController.markNotificationRead
);
router.patch(
  '/notifications/read-all',
  protect,
  authorize('USER'),
  userController.markAllNotificationsRead
);
router.get('/complaints/:id', protect, authorize('USER'), userController.getComplaintById);
router.patch('/complaints/:id/confirm', protect, authorize('USER'), userController.confirmCompletion);
router.patch('/complaints/:id/reopen', protect, authorize('USER'), userController.reopenComplaint);

module.exports = router;
