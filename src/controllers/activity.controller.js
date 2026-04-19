import httpStatus from "http-status";
import Activity from "../models/Activity.js";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import {
  parseStepInput,
  syncDailyStepAndStreak,
} from "../utils/stepTracking.js";

export const createActivity = catchAsync(async (req, res) => {
  const { category, notes, entry_time, steps } = req.body;

  if (!category) {
    throw new AppError("Category is required", httpStatus.BAD_REQUEST);
  }

  const parsed = parseStepInput(steps);

  if (parsed.trigger) {
    throw new AppError(
      "Secret trigger is only supported on step confirmation",
      httpStatus.BAD_REQUEST,
    );
  }

  const { dailyStep, streak } = await syncDailyStepAndStreak({
    userId: req.user._id,
    steps: parsed.value,
  });

  const activity = await Activity.create({
    user_id: req.user._id,
    daily_step_id: dailyStep._id,
    category,
    notes,
    entry_time: entry_time || new Date(),
    total_steps_at_entry: parsed.value,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Activity created successfully",
    data: {
      activity,
      step: dailyStep,
      streak,
    },
  });
});

export const getActivities = catchAsync(async (req, res) => {
  const activities = await Activity.find({ user_id: req.user._id })
    .populate("daily_step_id")
    .sort({ entry_time: -1, created_at: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Activities retrieved successfully",
    data: activities,
  });
});

export default {
  createActivity,
  getActivities,
};
