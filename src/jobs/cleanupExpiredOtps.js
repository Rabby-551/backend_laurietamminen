import cron from 'node-cron';
import User from '../models/User.js';

const cleanupExpiredOtps = cron.schedule(
  '*/15 * * * *',
  async () => {
    await User.updateMany(
      {
        otp_expires_at: { $lt: new Date() },
        otp: { $ne: null },
      },
      {
        $set: {
          otp: null,
          otp_expires_at: null,
          otp_verified: false,
        },
      },
    );
  },
  {
    scheduled: false,
  },
);

export default cleanupExpiredOtps;
