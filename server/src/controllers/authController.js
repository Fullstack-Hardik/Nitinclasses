const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Seed or auto-sync admin credentials strictly from .env
const seedDefaultAdmin = async () => {
  const envEmail = (process.env.ADMIN_EMAIL || 'nitinsirclasses@gmail.com').toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD || 'nitin@2026v1';

  let admin = await Admin.findOne();
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(envPassword, salt);

  if (!admin) {
    await Admin.create({
      email: envEmail,
      password: hashedPassword,
      name: 'Nitin Sir'
    });
    console.log(`[Admin] Initialized admin from .env: ${envEmail}`);
  } else {
    // Keep credentials synchronized with .env
    admin.email = envEmail;
    admin.password = hashedPassword;
    admin.name = 'Nitin Sir';
    await admin.save();
    console.log(`[Admin] Synced admin credentials from .env: ${envEmail}`);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    // Check if database is currently connected (readyState: 1 = connected)
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is not ready. Please verify Atlas Network Access / IP Whitelist or try again in a few moments.'
      });
    }

    const envEmail = (process.env.ADMIN_EMAIL || 'nitinsirclasses@gmail.com').toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD || 'nitin@2026v1';

    let admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin && email.toLowerCase() === envEmail) {
      await seedDefaultAdmin();
      admin = await Admin.findOne({ email: envEmail });
    }

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check lockout
    if (admin.isLocked()) {
      const minutesRemaining = Math.ceil((admin.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to 10 consecutive failed attempts. Try again in ${minutesRemaining} minutes.`
      });
    }

    // Authenticate: check direct match against current .env or bcrypt hash
    const isDirectMatch = (email.toLowerCase() === envEmail && password === envPassword);
    const isHashMatch = await admin.comparePassword(password);

    if (!isDirectMatch && !isHashMatch) {
      await admin.handleFailedLogin();
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Success -> reset lockout counter
    await admin.handleSuccessfulLogin();

    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

const getMe = async (req, res) => {
  return res.json({
    success: true,
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name
    }
  });
};

module.exports = {
  seedDefaultAdmin,
  login,
  getMe
};
