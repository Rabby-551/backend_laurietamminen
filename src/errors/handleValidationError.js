import httpStatus from 'http-status';
import AppError from './AppError.js';

const HandleValidationError = (error) => {
  const errors = Object.values(error.errors || {}).map((issue) => issue.message);
  const message = errors.length ? errors.join('. ') : 'Validation failed';

  return new AppError(message, httpStatus.BAD_REQUEST);
};

export default HandleValidationError;
