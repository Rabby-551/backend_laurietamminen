import { Buffer } from 'node:buffer';
import User from '../models/User.js';

const padSequence = (value) => String(value).padStart(2, '0');

export const formatClientDateSegment = (value) => {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

export const generateClientId = async (dateOfBirth, excludeUserId = null) => {
  const dateSegment = formatClientDateSegment(dateOfBirth);
  const prefix = `Client-${dateSegment}-`;

  const query = {
    client_id: {
      $regex: `^${prefix}`,
    },
  };

  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const users = await User.find(query).select('client_id');
  const highestSequence = users.reduce((maxSequence, user) => {
    const serial = Number(String(user.client_id).replace(prefix, ''));

    if (Number.isNaN(serial)) {
      return maxSequence;
    }

    return Math.max(maxSequence, serial);
  }, 0);

  return `${prefix}${padSequence(highestSequence + 1)}`;
};

export const getFormattedClientId = async (user) => user?.client_id || null;

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
