import httpStatus from 'http-status';
import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';
import AppError from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';
import pick from '../utils/pick.js';
import { getRefreshCookieClearOptions } from '../utils/token.js';
import { generateClientId } from '../utils/admin.js';

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

const parseNumber = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new AppError(`${fieldName} must be a valid number`, httpStatus.BAD_REQUEST);
  }

  return parsedValue;
};

export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile retrieved successfully',
    data: user,
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const allowedFields = pick(req.body, [
    'full_name',
    'email',
    'date_of_birth',
    'height',
    'weight',
    'height_unit',
    'weight_unit',
    'location_permission',
  ]);

  if (allowedFields.height !== undefined) {
    allowedFields.height = parseNumber(allowedFields.height, 'Height');
  }

  if (allowedFields.weight !== undefined) {
    allowedFields.weight = parseNumber(allowedFields.weight, 'Weight');
  }

  if (allowedFields.location_permission !== undefined) {
    allowedFields.location_permission = parseBoolean(allowedFields.location_permission);
  }

  if (allowedFields.email) {
    allowedFields.email = allowedFields.email.toLowerCase();
    const emailOwner = await User.findOne({ email: allowedFields.email });

    if (emailOwner && emailOwner._id.toString() !== req.user._id.toString()) {
      throw new AppError('Email already exists', httpStatus.CONFLICT);
    }
  }

  if (allowedFields.date_of_birth) {
    const parsedDateOfBirth = new Date(allowedFields.date_of_birth);

    if (Number.isNaN(parsedDateOfBirth.getTime())) {
      throw new AppError('Date of birth must be a valid date', httpStatus.BAD_REQUEST);
    }

    if (!req.user.client_id && req.user.role === 'client') {
      allowedFields.client_id = await generateClientId(req.user._id);
    }
  }

  if (req.file) {
    if (req.user.profile_picture_public_id) {
      await cloudinary.uploader.destroy(req.user.profile_picture_public_id).catch(() => null);
    }

    allowedFields.profile_picture_url = req.file.path;
    allowedFields.profile_picture_public_id = req.file.filename;
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, allowedFields, {
    new: true,
    runValidators: true,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
});

export const updateStepGoal = catchAsync(async (req, res) => {
  const { step_goal } = req.body;

  if (step_goal === undefined) {
    throw new AppError('Step goal is required', httpStatus.BAD_REQUEST);
  }

  const parsedStepGoal = parseNumber(step_goal, 'Step goal');

  if (parsedStepGoal < 1) {
    throw new AppError('Step goal must be at least 1', httpStatus.BAD_REQUEST);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { step_goal: parsedStepGoal },
    {
      new: true,
      runValidators: true,
    },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Step goal updated successfully',
    data: updatedUser,
  });
});

export const changePassword = catchAsync(async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    throw new AppError(
      'Current password, new password and confirm password are required',
      httpStatus.BAD_REQUEST,
    );
  }

  if (new_password !== confirm_password) {
    throw new AppError('New password and confirm password do not match', httpStatus.BAD_REQUEST);
  }

  const user = await User.findById(req.user._id).select('+password +refresh_token');

  if (!(await user.comparePassword(current_password))) {
    throw new AppError('Current password is incorrect', httpStatus.UNAUTHORIZED);
  }

  user.password = new_password;
  user.refresh_token = null;
  await user.save();

  res.clearCookie('refreshToken', getRefreshCookieClearOptions());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password changed successfully. Please log in again.',
  });
});

export default {
  getProfile,
  updateProfile,
  updateStepGoal,
  changePassword,
};
