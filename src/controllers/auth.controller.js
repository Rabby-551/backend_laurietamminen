import httpStatus from 'http-status';
import User from '../models/User.js';
import AppError from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';
import sendEmail from '../utils/email.js';
import generateOtp from '../utils/otp.js';
import {
  createAccessToken,
  createRefreshToken,
  getRefreshCookieClearOptions,
  getRefreshCookieOptions,
  verifyRefreshToken,
} from '../utils/token.js';

const buildAuthPayload = (user) => ({
  user,
  access_token: createAccessToken({ id: user._id, role: user.role }),
});

const setRefreshToken = async (user, res) => {
  const refreshToken = createRefreshToken({ id: user._id, role: user.role });
  user.refresh_token = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

  return refreshToken;
};

export const register = catchAsync(async (req, res) => {
  const {
    full_name,
    phone_number,
    email,
    password,
    confirm_password,
    role,
    user_role,
    type,
    date_of_birth,
    height,
    weight,
    step_goal,
    height_unit,
    weight_unit,
    location_permission
  } = req.body;

  if (!full_name || !phone_number || !email || !password || !confirm_password) {
    throw new AppError('All registration fields are required', httpStatus.BAD_REQUEST);
  }

  if (password !== confirm_password) {
    throw new AppError('Password and confirm password do not match', httpStatus.BAD_REQUEST);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new AppError('Email already exists', httpStatus.CONFLICT);
  }

  // Determine role (check multiple possible keys sent by admin panel)
  const finalRole = role || user_role || type || 'user';

  const user = await User.create({
    full_name,
    phone_number,
    email,
    password,
    role: finalRole,
    date_of_birth,
    height,
    weight,
    step_goal,
    height_unit,
    weight_unit,
    location_permission
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'User registered successfully',
    data: user,
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', httpStatus.BAD_REQUEST);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refresh_token');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', httpStatus.UNAUTHORIZED);
  }

  if (!user.is_active) {
    throw new AppError('Your account is inactive', httpStatus.FORBIDDEN);
  }

  const refreshToken = await setRefreshToken(user, res);
  const payload = buildAuthPayload(user.toJSON());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Login successful',
    data: {
      ...payload,
      refresh_token: refreshToken,
    },
  });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', httpStatus.BAD_REQUEST);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+otp +otp_expires_at +otp_verified',
  );

  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
  user.otp_verified = false;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: user.email,
    subject: 'Steps Journey password reset OTP',
    text: `Your Steps Journey OTP is ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Steps Journey</h2>
        <p>Your OTP for password reset is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'OTP sent successfully',
  });
});

export const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError('Email and OTP are required', httpStatus.BAD_REQUEST);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+otp +otp_expires_at +otp_verified',
  );

  if (!user || !user.otp) {
    throw new AppError('OTP not found. Please request a new OTP', httpStatus.BAD_REQUEST);
  }

  if (user.otp_expires_at < new Date()) {
    throw new AppError('OTP has expired', httpStatus.BAD_REQUEST);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP', httpStatus.BAD_REQUEST);
  }

  user.otp_verified = true;
  await user.save({ validateBeforeSave: false });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'OTP verified successfully',
  });
});

export const resetPassword = catchAsync(async (req, res) => {
  const { email, new_password, confirm_password } = req.body;

  if (!email || !new_password || !confirm_password) {
    throw new AppError('Email, new password and confirm password are required', httpStatus.BAD_REQUEST);
  }

  if (new_password !== confirm_password) {
    throw new AppError('New password and confirm password do not match', httpStatus.BAD_REQUEST);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password +otp +otp_expires_at +otp_verified +refresh_token',
  );

  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  if (!user.otp_verified || !user.otp_expires_at || user.otp_expires_at < new Date()) {
    throw new AppError('OTP verification is required before resetting password', httpStatus.BAD_REQUEST);
  }

  user.password = new_password;
  user.otp = null;
  user.otp_expires_at = null;
  user.otp_verified = false;
  user.refresh_token = null;
  await user.save();

  res.clearCookie('refreshToken', getRefreshCookieClearOptions());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password reset successful',
  });
});

export const refreshToken = catchAsync(async (req, res) => {
  const providedToken = req.cookies?.refreshToken || req.body?.refresh_token;

  if (!providedToken) {
    throw new AppError('Refresh token is required', httpStatus.UNAUTHORIZED);
  }

  const decoded = verifyRefreshToken(providedToken);
  const user = await User.findById(decoded.id).select('+refresh_token');

  if (!user || !user.refresh_token) {
    throw new AppError('Invalid refresh token', httpStatus.UNAUTHORIZED);
  }

  if (user.refresh_token !== providedToken) {
    throw new AppError('Refresh token mismatch', httpStatus.UNAUTHORIZED);
  }

  const accessToken = createAccessToken({ id: user._id, role: user.role });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Access token refreshed successfully',
    data: {
      access_token: accessToken,
    },
  });
});

export const logout = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('+refresh_token');

  if (user) {
    user.refresh_token = null;
    await user.save({ validateBeforeSave: false });
  }

  res.clearCookie('refreshToken', getRefreshCookieClearOptions());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Logout successful',
  });
});

export default {
  register,
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  refreshToken,
  logout,
};
