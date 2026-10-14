require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { seedDefaultAdmin } = require('./controllers/authController');
const { apiRateLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const feeRoutes = require('./routes/feeRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Enable trust proxy for reverse proxies (Render, Vercel, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Security Middlewares - JSON REST API setup
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration for Render backend & Vercel frontend / custom domains
const rawClientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.trim().replace(/\/+$/, '') : '';
const clientUrlWithHttps = rawClientUrl && !rawClientUrl.startsWith('http') ? `https://${rawClientUrl}` : rawClientUrl;
const clientUrlWithHttp = rawClientUrl && !rawClientUrl.startsWith('http') ? `http://${rawClientUrl}` : rawClientUrl;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  clientUrlWithHttps,
  clientUrlWithHttp,
  'https://nitinclass.com',
  'http://nitinclass.com',
  'https://www.nitinclass.com',
  'http://www.nitinclass.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = 
      allowedOrigins.includes(origin) ||
      process.env.NODE_ENV !== 'production' ||
      origin.endsWith('.vercel.app') ||
      origin.includes('nitinclass.com');

    if (isAllowed) {
      return callback(null, true);
    }
    // Return false instead of throwing Error so Express doesn't crash into 500
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general API rate limiter
app.use('/api/', apiRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Nitin Sir Classes API'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

const PORT = process.env.PORT || 5000;

// Connect DB and Start Server
connectDB().then(async () => {
  await seedDefaultAdmin();
  app.listen(PORT, () => {
    console.log(`[Server] Nitin Sir Classes API running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('[DB Startup Error]', err);
  // Still listen so server doesn't crash on bad URI in dev
  app.listen(PORT, () => {
    console.log(`[Server] Nitin Sir Classes API listening on port ${PORT} (DB offline)`);
  });
});

module.exports = app;
