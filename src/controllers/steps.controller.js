import httpStatus from 'http-status';
import { randomUUID } from 'node:crypto';
import DailyStep from '../models/DailyStep.js';
import DailyStreak from '../models/DailyStreak.js';
import TriggerToken from '../models/trigger_token.model.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/sendResponse.js';
import { formatUtcDate, getRecentUtcDates, startOfUtcDay } from '../utils/date.js';
import { parseStepInput, syncDailyStepAndStreak } from '../utils/stepTracking.js';

export const confirmSteps = catchAsync(async (req, res) => {
  const parsed = parseStepInput(req.body.steps);

  if (parsed.trigger) {
    const token = randomUUID();

    await TriggerToken.create({
      user_id: req.user._id,
      token,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      is_used: false,
    });

    return res.status(httpStatus.OK).json({
      trigger: true,
      trigger_token: token,
    });
  }

  const { dailyStep, streak } = await syncDailyStepAndStreak({
    userId: req.user._id,
    steps: parsed.value,
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Steps confirmed successfully',
    data: {
      step: dailyStep,
      streak,
    },
  });
});

export const getTodaySteps = catchAsync(async (req, res) => {
  const today = startOfUtcDay(new Date());
  const dailyStep = await DailyStep.findOne({
    user_id: req.user._id,
    date: today,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Today steps retrieved successfully',
    data: dailyStep,
  });
});

export const getWeeklySteps = catchAsync(async (req, res) => {
  const recentDates = getRecentUtcDates(7);
  const rangeStart = recentDates[0];
  const today = recentDates[recentDates.length - 1];

  const [steps, streak] = await Promise.all([
    DailyStep.find({
      user_id: req.user._id,
      date: {
        $gte: rangeStart,
        $lte: today,
      },
    }).sort({ date: 1 }),
    DailyStreak.findOne({ user_id: req.user._id }),
  ]);

  const stepMap = new Map(steps.map((item) => [formatUtcDate(item.date), item]));
  const weeklyActivity = recentDates.map((date) => {
    const key = formatUtcDate(date);
    const record = stepMap.get(key);

    return {
      date,
      steps: record?.steps ?? 0,
      intensity: record?.intensity ?? null,
    };
  });

  const todayKey = formatUtcDate(today);
  const todaySteps = stepMap.get(todayKey)?.steps ?? 0;
  const dailyMomentum = req.user.step_goal
    ? Number(((todaySteps / req.user.step_goal) * 100).toFixed(2))
    : 0;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Weekly steps retrieved successfully',
    data: {
      weekly_activity: weeklyActivity,
      daily_momentum: dailyMomentum,
      today_steps: todaySteps,
      step_goal: req.user.step_goal,
      streak,
    },
  });
});

export default {
  confirmSteps,
  getTodaySteps,
  getWeeklySteps,
};
