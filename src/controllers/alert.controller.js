import httpStatus from "http-status";
import Alert from "../models/Alert.js";
import TriggerToken from "../models/trigger_token.model.js";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import {
  emitAlertLocationUpdate,
  emitAlertStatusChanged,
  emitNewAlert,
} from "../sockets/index.js";

const parseCoordinates = ({ lat, lng }) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new AppError(
      "Latitude and longitude must be valid numbers",
      httpStatus.BAD_REQUEST,
    );
  }

  return {
    lat: parsedLat,
    lng: parsedLng,
  };
};

const parseOptionalAccuracy = (accuracy) => {
  if (accuracy === undefined || accuracy === null || accuracy === "") {
    return null;
  }

  const parsedAccuracy = Number(accuracy);

  if (!Number.isFinite(parsedAccuracy) || parsedAccuracy < 0) {
    throw new AppError(
      "Accuracy must be a valid non-negative number",
      httpStatus.BAD_REQUEST,
    );
  }

  return parsedAccuracy;
};

const serializeAlertPayload = (alert, user) => ({
  alert_id: alert._id,
  client_id: user?.client_id || alert.client_id?.client_id || null,
  client_user_id: user?._id || alert.client_id?._id || alert.client_id,
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

/**
 * Compare two dates by their date-only portion (YYYY-MM-DD).
 * Timezone-proof: extracts the "YYYY-MM-DD" string directly
 * so it works identically from any timezone in the world.
 */
const extractDateOnly = (input) => {
  if (!input) return null;
  const str = String(input instanceof Date ? input.toISOString() : input);
  // If already "YYYY-MM-DD" (10 chars), use directly
  const dateOnly = str.substring(0, 10);
  // Validate format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  return null;
};

const compareDateOnly = (storedDate, inputDate) => {
  // For the stored date (from MongoDB), we need to handle potential timezone shifts.
  // Re-parse it as UTC midnight to get the intended calendar date.
  const getStoredDateString = (d) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    // Use UTC components to build YYYY-MM-DD
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // For the input date (from client request), extract the YYYY-MM-DD directly
  // from the string to avoid any Date parsing timezone shifts.
  const getInputDateString = (d) => {
    if (!d) return null;
    const str = String(d);
    // Extract YYYY-MM-DD from the beginning of the string
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    // Fallback: parse as Date and use UTC components
    const date = new Date(str);
    if (isNaN(date.getTime())) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const d1 = getStoredDateString(storedDate);
  const d2 = getInputDateString(inputDate);

  if (!d1 || !d2) return false;
  return d1 === d2;
};

export const triggerAlert = catchAsync(async (req, res) => {
  const {
    trigger_token,
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
    throw new AppError(
      "Date of birth is not set for this account",
      httpStatus.BAD_REQUEST,
    );
  }

  if (!date_of_birth) {
    throw new AppError("Date of birth is required", httpStatus.BAD_REQUEST);
  }

  // Debug: log the exact values being compared for DOB verification
  console.log("[DOB Comparison Debug]", {
    storedDOB: req.user.date_of_birth,
    storedDOB_ISO: req.user.date_of_birth instanceof Date ? req.user.date_of_birth.toISOString() : String(req.user.date_of_birth),
    inputDOB: date_of_birth,
    inputDOB_type: typeof date_of_birth,
  });

  if (!compareDateOnly(req.user.date_of_birth, date_of_birth)) {
    throw new AppError("Date of birth does not match", httpStatus.BAD_REQUEST);
  }

  const triggerToken = await TriggerToken.findOne({
    token: trigger_token,
    user_id: req.user._id,
    expires_at: { $gt: new Date() },
    is_used: false,
  });

  if (!triggerToken) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Invalid request",
    });
  }

  triggerToken.is_used = true;
  await triggerToken.save({ validateBeforeSave: false });

  const alert = await Alert.create({
    client_id: req.user._id,
    coordinates: parseCoordinates({ lat, lng }),
    accuracy: parseOptionalAccuracy(accuracy),
    street_address,
    signal_strength,
    connection_state,
    device_id,
    dob: date_of_birth,
    last_sync_at: new Date(),
  });

  const payload = serializeAlertPayload(alert, req.user);
  emitNewAlert(payload);

  return res.status(httpStatus.CREATED).json({
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
    throw new AppError("Alert not found", httpStatus.NOT_FOUND);
  }

  const payload = serializeAlertPayload(alert, req.user);
  emitAlertLocationUpdate(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Alert location updated successfully",
    data: payload,
  });
});

export const updateAlertStatus = catchAsync(async (req, res) => {
  const { status } = req.body;

  if (!["in_progress", "resolved"].includes(status)) {
    throw new AppError(
      "Status must be either in_progress or resolved",
      httpStatus.BAD_REQUEST,
    );
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
  ).populate("client_id", "full_name client_id");

  if (!alert) {
    throw new AppError("Alert not found", httpStatus.NOT_FOUND);
  }

  const payload = serializeAlertPayload(alert, alert.client_id);
  emitAlertStatusChanged(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Alert status updated successfully",
    data: payload,
  });
});

export default {
  triggerAlert,
  updateAlertLocation,
  updateAlertStatus,
};
