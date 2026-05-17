const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ─── Load Environment Variables ───────────────────────────────────────────────
dotenv.config();

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ─── Initialize Express ────────────────────────────────────────────────────────
const app = express();

// ─── Core Middleware ───────────────────────────────────────────────────────────

// Set security HTTP headers
app.use(helmet());

// Enable CORS — allows the React frontend (and later Flutter app) to communicate
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// HTTP request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Parse incoming JSON bodies
app.use(express.json());

// Global rate limiter — 100 requests per 10 minutes per IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ─── API Routes ────────────────────────────────────────────────────────────────
// All routes are versioned under /api/v1/ — Flutter-ready from day one.

app.use('/api/v1/auth',      require('./routes/authRoutes'));
app.use('/api/v1/products',  require('./routes/productRoutes'));
app.use('/api/v1/orders',    require('./routes/orderRoutes'));
app.use('/api/v1/sales',     require('./routes/salesRoutes'));
app.use('/api/v1/employees', require('./routes/employeeRoutes'));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🟢 Shop Management API is running.',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`💥 Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
