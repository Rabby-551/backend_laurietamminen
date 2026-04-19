import httpStatus from 'http-status';
import Alert from '../models/Alert.js';
import AppError from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';
import { compareDateOnly } from '../utils/date.js';
import {
  emitAlertLocationUpdate,
  emitAlertStatusChanged,
  emitNewAlert,
} from '../sockets/index.js';

const parseCoordinates = ({ lat, lng }) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new AppError('Latitude and longitude must be valid numbers', httpStatus.BAD_REQUEST);
  }

  return {
    lat: parsedLat,
    lng: parsedLng,
  };
};

const parseOptionalAccuracy = (accuracy) => {
  if (accuracy === undefined || accuracy === null || accuracy === '') {
    return null;
  }

  const parsedAccuracy = Number(accuracy);

  if (!Number.isFinite(parsedAccuracy) || parsedAccuracy < 0) {
    throw new AppError('Accuracy must be a valid non-negative number', httpStatus.BAD_REQUEST);
  }

  return parsedAccuracy;
};

const serializeAlertPayload = (alert, user) => ({
  alert_id: alert._id,
  client_id: user?._id || alert.client_id,
  full_name: user?.full_name,
  coordinates: alert.coordinates,
  accuracy: alert.accuracy,
  street_address: alert.street_address,
  signal_strength: alert.signal_strength,
  connection_state: alert.connection_state,
  device_id: alert.device_id,
  status: alert.status,
  last_sync_at: alert.last_sync_at,
  created_at: alert.created_at,
  updated_at: alert.updated_at,
});

export const triggerAlert = catchAsync(async (req, res) => {
  const {
    date_of_birth,
    lat,
    lng,
    accuracy,
    street_address,
    signal_strength,
    connection_state,
    device_id,
  } = req.body;

  if (!req.user.date_of_birth) {
    throw new AppError('Date of birth is not set for this account', httpStatus.BAD_REQUEST);
  }

  if (!date_of_birth) {
    throw new AppError('Date of birth is required', httpStatus.BAD_REQUEST);
  }

  if (!compareDateOnly(req.user.date_of_birth, date_of_birth)) {
    throw new AppError('Date of birth does not match', httpStatus.BAD_REQUEST);
  }

  const alert = await Alert.create({
    client_id: req.user._id,
    coordinates: parseCoordinates({ lat, lng }),
    accuracy: parseOptionalAccuracy(accuracy),
    street_address,
    signal_strength,
    connection_state,
    device_id,
    last_sync_at: new Date(),
  });

  const payload = serializeAlertPayload(alert, req.user);
  emitNewAlert(payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Alert triggered successfully',
    data: payload,
  });
});

export const updateAlertLocation = catchAsync(async (req, res) => {
  const updates = {
    coordinates: parseCoordinates({
      lat: req.body.lat,
      lng: req.body.lng,
    }),
    last_sync_at: new Date(),
  };

  if (req.body.accuracy !== undefined) {
    updates.accuracy = parseOptionalAccuracy(req.body.accuracy);
  }

  if (req.body.street_address !== undefined) {
    updates.street_address = req.body.street_address;
  }

  if (req.body.signal_strength !== undefined) {
    updates.signal_strength = req.body.signal_strength;
  }

  if (req.body.connection_state !== undefined) {
    updates.connection_state = req.body.connection_state;
  }

  if (req.body.device_id !== undefined) {
    updates.device_id = req.body.device_id;
  }

  const alert = await Alert.findOneAndUpdate(
    {
      _id: req.params.id,
      client_id: req.user._id,
    },
    updates,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!alert) {
    throw new AppError('Alert not found', httpStatus.NOT_FOUND);
  }

  const payload = serializeAlertPayload(alert, req.user);
  emitAlertLocationUpdate(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Alert location updated successfully',
    data: payload,
  });
});

export const updateAlertStatus = catchAsync(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw new AppError('Status is required', httpStatus.BAD_REQUEST);
  }

  const alert = await Alert.findByIdAndUpdate(
    req.params.id,
    {
      status,
      last_sync_at: new Date(),
    },
    {
      new: true,
      runValidators: true,
    },
  ).populate('client_id', 'full_name');

  if (!alert) {
    throw new AppError('Alert not found', httpStatus.NOT_FOUND);
  }

  const payload = serializeAlertPayload(alert, alert.client_id);
  emitAlertStatusChanged(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Alert status updated successfully',
    data: payload,
  });
});

export default {
  triggerAlert,
  updateAlertLocation,
  updateAlertStatus,
};
