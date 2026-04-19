import jwt from 'jsonwebtoken';

const parseExpiryToMilliseconds = (value, fallbackMilliseconds) => {
  if (!value || typeof value !== 'string') {
    return fallbackMilliseconds;
  }

  const match = value.trim().match(/^(\d+)([smhd])$/i);

  if (!match) {
    return fallbackMilliseconds;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

export const createAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

export const createRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

export const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const buildBaseRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
});

export const getRefreshCookieOptions = () => ({
  ...buildBaseRefreshCookieOptions(),
  maxAge: parseExpiryToMilliseconds(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 7 * 24 * 60 * 60 * 1000),
});

export const getRefreshCookieClearOptions = () => buildBaseRefreshCookieOptions();

export default {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
  getRefreshCookieClearOptions,
};
