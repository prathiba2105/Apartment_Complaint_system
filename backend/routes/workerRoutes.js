const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const workerController = require('../controllers/workerController');

router.get('/dashboard', protect, authorize('WORKER'), workerController.getDashboard);
router.get('/complaints', protect, authorize('WORKER'), workerController.getComplaints);
router.get('/complaints/:id', protect, authorize('WORKER'), workerController.getComplaintById);
router.patch('/status', protect, authorize('WORKER'), workerController.updateStatus);
router.patch('/complaints/:id/accept', protect, authorize('WORKER'), workerController.acceptComplaint);
router.patch('/complaints/:id/start', protect, authorize('WORKER'), workerController.startComplaint);
router.patch('/complaints/:id/complete', protect, authorize('WORKER'), workerController.completeComplaint);
router.patch('/complaints/:id/reject', protect, authorize('WORKER'), workerController.rejectComplaint);
router.post('/complaints/:id/notes', protect, authorize('WORKER'), workerController.addNote);
router.get('/notifications', protect, authorize('WORKER'), workerController.getNotifications);
router.patch(
  '/notifications/:id/read',
  protect,
  authorize('WORKER'),
  workerController.markNotificationRead
);

module.exports = router;
