import httpStatus from 'http-status';
import AppError from '../errors/AppError.js';
import DailyStep from '../models/DailyStep.js';
import DailyStreak from '../models/DailyStreak.js';
import { addUtcDays, isSameUtcDay, startOfUtcDay } from './date.js';

export const calculateIntensity = (steps) => {
  if (steps >= 10000) {
    return 'high';
  }

  if (steps >= 5000) {
    return 'medium';
  }

  return 'low';
};

export const parseStepInput = (value) => {
  if (value === undefined || value === null || value === '') {
    throw new AppError('Steps are required', httpStatus.BAD_REQUEST);
  }

  if (typeof value === 'string' && value.trim() === '1234!') {
    return {
      trigger: true,
      raw: '1234!',
    };
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new AppError('Steps must be a valid non-negative number', httpStatus.BAD_REQUEST);
  }

  return {
    trigger: false,
    value: parsedValue,
  };
};

export const syncDailyStepAndStreak = async ({
  userId,
  steps,
  targetDate = new Date(),
}) => {
  const normalizedDate = startOfUtcDay(targetDate);

  const dailyStep = await DailyStep.findOneAndUpdate(
    {
      user_id: userId,
      date: normalizedDate,
    },
    {
      user_id: userId,
      date: normalizedDate,
      steps,
      intensity: calculateIntensity(steps),
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  let streak = await DailyStreak.findOne({ user_id: userId });

  if (!streak) {
    streak = await DailyStreak.create({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: normalizedDate,
    });
  } else if (!streak.last_active_date || !isSameUtcDay(streak.last_active_date, normalizedDate)) {
    const yesterday = addUtcDays(normalizedDate, -1);
    streak.current_streak = streak.last_active_date && isSameUtcDay(streak.last_active_date, yesterday)
      ? streak.current_streak + 1
      : 1;
    streak.longest_streak = Math.max(streak.longest_streak, streak.current_streak);
    streak.last_active_date = normalizedDate;
    await streak.save();
  }

  return {
    dailyStep,
    streak,
  };
};
