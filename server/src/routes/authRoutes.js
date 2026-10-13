const express = require('express');
const router = express.Router();
const { login, getMe, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginRateLimiter, login);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);

module.exports = router;
