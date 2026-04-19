import httpStatus from 'http-status';
import AppError from './AppError.js';
import HandleCastError from './handleCastError.js';
import HandleDuplicateError from './handleDuplicateError.js';
import HandleValidationError from './handleValidationError.js';

const sendErrorDevelopment = (error, res) =>
  res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error.message,
    error,
    stack: error.stack,
  });

const sendErrorProduction = (error, res) => {
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Something went wrong',
  });
};

const globalErrorHandler = (error, req, res, next) => {
  let normalizedError = error;
  normalizedError.statusCode = normalizedError.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  normalizedError.message = normalizedError.message || 'Something went wrong';

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDevelopment(normalizedError, res);
  }

  if (normalizedError.name === 'CastError') {
    normalizedError = HandleCastError(normalizedError);
  } else if (normalizedError.code === 11000) {
    normalizedError = HandleDuplicateError(normalizedError);
  } else if (normalizedError.name === 'ValidationError') {
    normalizedError = HandleValidationError(normalizedError);
  } else if (normalizedError.name === 'JsonWebTokenError') {
    normalizedError = new AppError('Invalid token', httpStatus.UNAUTHORIZED);
  } else if (normalizedError.name === 'TokenExpiredError') {
    normalizedError = new AppError('Token has expired', httpStatus.UNAUTHORIZED);
  }

  return sendErrorProduction(normalizedError, res);
};

export default globalErrorHandler;
