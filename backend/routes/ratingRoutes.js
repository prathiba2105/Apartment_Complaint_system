const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const ratingController = require('../controllers/ratingController');

// User rates the worker after completion
router.post(
  '/complaints/:id/ratings',
  protect,
  authorize('USER'),
  ratingController.addRating
);

module.exports = router;
