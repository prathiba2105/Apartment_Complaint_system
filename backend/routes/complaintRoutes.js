const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { createComplaint } = require('../controllers/complaintController');
const adminController = require('../controllers/adminController');

// Public: active complaint categories for dynamic selection in forms
router.get('/categories', adminController.getActiveCategories);

router.post('/complaints', protect, authorize('USER'), createComplaint);

module.exports = router;
