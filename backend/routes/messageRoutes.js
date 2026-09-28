const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');

// Complaint-specific chat. Available to USER (owner), WORKER (assigned), ADMIN.
router.get('/complaints/:id/messages', protect, messageController.getMessages);
router.post('/complaints/:id/messages', protect, messageController.sendMessage);

module.exports = router;
