const ErrorResponse = require('../utils/errorResponse');

/**
 * Global Express error-handling middleware.
 * Catches all errors thrown in controllers and formats a consistent JSON response.
 * Must be registered LAST in server.js after all routes.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // Mongoose bad ObjectId (e.g. /products/not-an-id)
  if (err.name === 'CastError') {
    const message = `Resource not found with id: ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for field: ${field}. Please use a different value.`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error (e.g. missing required fields)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message.join('. '), 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ErrorResponse('Invalid token. Please log in again.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('Token expired. Please log in again.', 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
