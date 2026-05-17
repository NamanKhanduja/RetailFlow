const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

/**
 * protect — Verifies the JWT and attaches the authenticated user to req.user.
 * Apply this middleware to any route that requires authentication.
 */
exports.protect = async (req, res, next) => {
  let token;

  // Accept token from Authorization header: "Bearer <token>"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized. No token provided.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the full user document (excluding password) to the request
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(new ErrorResponse('User belonging to this token no longer exists.', 401));
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized. Token is invalid or expired.', 401));
  }
};
