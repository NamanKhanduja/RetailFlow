/**
 * Custom error response class that extends the native Error.
 * Allows controllers to throw structured errors with HTTP status codes.
 *
 * Usage: throw new ErrorResponse('Resource not found', 404);
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;
