const express = require('express');
const router = express.Router();
const {
  registerUser,
  registerWorker,
  loginUser,
  loginWorker,
  loginAdmin,
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/worker/register', registerWorker);
router.post('/worker/login', loginWorker);
router.post('/admin/login', loginAdmin);

module.exports = router;
