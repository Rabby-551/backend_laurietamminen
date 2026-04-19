import httpStatus from 'http-status';
import User from '../models/User.js';
import AppError from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { verifyAccessToken } from '../utils/token.js';

export const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new AppError('You are not authorized', httpStatus.UNAUTHORIZED);
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.id);

  if (!user || !user.is_active) {
    throw new AppError('User no longer exists or is inactive', httpStatus.UNAUTHORIZED);
  }

  req.user = user;
  next();
});

export default protect;
