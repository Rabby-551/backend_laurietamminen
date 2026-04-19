import { Buffer } from 'node:buffer';
import User from '../models/User.js';
import { startOfUtcDay, addUtcDays } from './date.js';

const padSequence = (value) => String(value).padStart(2, '0');

export const formatClientDateSegment = (value) => {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

export const getFormattedClientId = async (user) => {
  const createdAt = new Date(user.created_at || user.createdAt || Date.now());
  const dayStart = startOfUtcDay(createdAt);
  const nextDay = addUtcDays(dayStart, 1);

  const sequence = await User.countDocuments({
    role: 'client',
    created_at: {
      $gte: dayStart,
      $lt: nextDay,
    },
    $or: [
      {
        created_at: {
          $lt: createdAt,
        },
      },
      {
        created_at: createdAt,
        _id: {
          $lte: user._id,
        },
      },
    ],
  });

  return `Client-${formatClientDateSegment(createdAt)}-${padSequence(sequence || 1)}`;
};

export const encryptConnectionState = (value) => {
  if (!value) {
    return '';
  }

  return Buffer.from(String(value), 'utf8').toString('base64');
};

export const formatActiveDuration = (startValue, endValue = new Date()) => {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const totalSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(' ');
};
