const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Seed admin if not present
const seedDefaultAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || 'admin@nitinsirclasses.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const existingAdmin = await Admin.findOne({ email });
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await Admin.create({
      email,
      password: hashedPassword,
      name: 'Nitin Sir'
    });
    console.log(`[Admin] Initialized default admin: ${email}`);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
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

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
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
    return res.status(500).json({ success: false, message: error.message });
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

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required' });
    }

    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  seedDefaultAdmin,
  login,
  getMe,
  updatePassword
};
