import httpStatus from "http-status";
import Alert from "../models/Alert.js";
import User from "../models/User.js";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import {
  encryptConnectionState,
  formatActiveDuration,
  getFormattedClientId,
} from "../utils/admin.js";
import { emitAlertStatusChanged } from "../sockets/index.js";

const ALERT_FILTERS = ["all", "pending", "in_progress", "resolved"];
const USER_FILTERS = ["all", "user", "client"];
const STATUS_UPDATES = ["in_progress", "resolved"];

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildAlertListItem = (alert) => ({
  alert_id: alert._id,
  client_id: alert.client_id?.client_id || null,
  client_user_id: alert.client_id?._id,
  full_name: alert.client_id?.full_name || "",
  phone_number: alert.client_id?.phone_number || "",
  coordinates: alert.coordinates,
  status: alert.status,
  street_address: alert.street_address,
  last_sync_at: alert.last_sync_at,
  created_at: alert.created_at,
});

const buildAlertStatusPayload = (alert) => ({
  alert_id: alert._id,
  client_id: alert.client_id?.client_id || null,
  client_user_id: alert.client_id?._id || alert.client_id,
  full_name: alert.client_id?.full_name || "",
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

export const getAdminAlerts = catchAsync(async (req, res) => {
  const filter = req.query.filter || "all";

  if (!ALERT_FILTERS.includes(filter)) {
    throw new AppError("Invalid alert filter", httpStatus.BAD_REQUEST);
  }

  const query = filter === "all" ? {} : { status: filter };
  const { page, limit, skip } = parsePagination(req.query);

  const [alerts, total] = await Promise.all([
    Alert.find(query)
      .populate(
        "client_id",
        "full_name phone_number email profile_picture_url profile_picture_public_id client_id",
      )
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit),
    Alert.countDocuments(query),
  ]);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin alerts retrieved successfully",
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
      filter,
    },
    data: alerts.map(buildAlertListItem),
  });
});

export const getAdminAlertDetail = catchAsync(async (req, res) => {
  const alert = await Alert.findById(req.params.id).populate(
    "client_id",
    "full_name phone_number role created_at client_id",
  );

  if (!alert) {
    throw new AppError("Alert not found", httpStatus.NOT_FOUND);
  }

  const clientDisplayId = alert.client_id
    ? await getFormattedClientId(alert.client_id)
    : null;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin alert detail retrieved successfully",
    data: {
      alert_id: alert._id,
      client_id: clientDisplayId,
      client_user_id: alert.client_id?._id,
      full_name: alert.client_id?.full_name || "",
      phone_number: alert.client_id?.phone_number || "",
      coordinates: {
        lat: alert.coordinates?.lat,
        lng: alert.coordinates?.lng,
        accuracy: alert.accuracy,
      },
      active_duration: formatActiveDuration(alert.created_at),
      street_address: alert.street_address,
      signal_strength: alert.signal_strength,
      connection_state: encryptConnectionState(alert.connection_state),
      device_id: alert.device_id,
      last_sync_at: alert.last_sync_at,
      status: alert.status,
      created_at: alert.created_at,
      updated_at: alert.updated_at,
      operational_status_buttons: ["mark_in_progress", "resolve"],
    },
  });
});

export const updateAdminAlertStatus = catchAsync(async (req, res) => {
  const { status } = req.body;

  if (!STATUS_UPDATES.includes(status)) {
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

  const payload = buildAlertStatusPayload(alert);
  emitAlertStatusChanged(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin alert status updated successfully",
    data: payload,
  });
});

export const getAdminUsers = catchAsync(async (req, res) => {
  const filter = req.query.filter || "all";

  if (!USER_FILTERS.includes(filter)) {
    throw new AppError("Invalid user filter", httpStatus.BAD_REQUEST);
  }

  const query = filter === "all" ? {} : { role: filter };
  const users = await User.find(query)
    .select("full_name email phone_number role is_active created_at")
    .sort({ created_at: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin users retrieved successfully",
    meta: {
      filter,
      total: users.length,
    },
    data: users,
  });
});

export const toggleAdminUserActive = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }

  user.is_active = !user.is_active;
  await user.save({ validateBeforeSave: false });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: `User ${user.is_active ? "unblocked" : "blocked"} successfully`,
    data: user,
  });
});

export default {
  getAdminAlerts,
  getAdminAlertDetail,
  updateAdminAlertStatus,
  getAdminUsers,
  toggleAdminUserActive,
};
