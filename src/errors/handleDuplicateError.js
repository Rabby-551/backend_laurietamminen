import httpStatus from 'http-status';
import AppError from './AppError.js';

const HandleDuplicateError = (error) => {
  const duplicatedFields = Object.keys(error.keyValue || {});
  const fields = duplicatedFields.length ? duplicatedFields.join(', ') : 'field';

  return new AppError(`${fields} already exists`, httpStatus.CONFLICT);
};

export default HandleDuplicateError;
