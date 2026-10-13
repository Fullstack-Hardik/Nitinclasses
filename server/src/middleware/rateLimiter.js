const rateLimit = require('express-rate-limit');

// Strict rate limiter for login attempts: 10 attempts per 15 minutes per IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter: reasonable limit for admin interactions (300 requests per 5 minutes)
const apiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: 'Too many API requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginRateLimiter, apiRateLimiter };
