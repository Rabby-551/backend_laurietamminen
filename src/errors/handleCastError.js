import httpStatus from 'http-status';
import AppError from './AppError.js';

const HandleCastError = (error) =>
  new AppError(`Invalid ${error.path}: ${error.value}`, httpStatus.BAD_REQUEST);

export default HandleCastError;
