const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');
const settingsController = require('../controllers/settingsController');
const ratingController = require('../controllers/ratingController');

router.use(protect, authorize('ADMIN'));

// Dashboard
router.get('/dashboard/stats', adminController.getStats);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Workers
router.get('/workers', adminController.getWorkers);
router.get('/workers/available', adminController.getAvailableWorkers);
router.get('/workers/:id', adminController.getWorkerById);
router.post('/workers', adminController.addWorker);
router.put('/workers/:id', adminController.updateWorker);
router.patch('/workers/:id/status', adminController.updateWorkerStatus);
router.delete('/workers/:id', adminController.deleteWorker);

// Complaints
router.get('/complaints', adminController.getComplaints);
router.get('/complaints/:id', adminController.getComplaintById);
router.post('/complaints/:id/assign', adminController.assignWorker);
router.post('/complaints/:id/reassign', adminController.reassignWorker);
router.patch('/complaints/:id/status', adminController.updateComplaintStatus);

// Categories
router.get('/categories', adminController.getCategories);
router.get('/categories/active', adminController.getActiveCategories);
router.post('/categories', adminController.addCategory);
router.put('/categories/:id', adminController.updateCategory);
router.patch('/categories/:id', adminController.deleteCategory);

// Notifications
router.get('/notifications', adminController.getAdminNotifications);
router.patch('/notifications/read-all', adminController.markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', adminController.markAdminNotificationRead);
router.delete('/notifications/:id', adminController.deleteAdminNotification);
router.post('/notification', adminController.sendNotification);

// Reports
router.get('/reports', adminController.getReports);
router.get('/reports/worker-performance', adminController.getWorkerPerformance);

// Worker ratings (admin view)
router.get('/ratings/worker/:workerId', ratingController.getWorkerRating);

// Settings
router.get('/settings', settingsController.get);
router.put('/settings', settingsController.update);

module.exports = router;
