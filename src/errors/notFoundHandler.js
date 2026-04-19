import httpStatus from 'http-status';
import AppError from './AppError.js';

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, httpStatus.NOT_FOUND));
};

export default notFoundHandler;
