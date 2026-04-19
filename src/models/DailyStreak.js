import mongoose from 'mongoose';

const dailyStreakSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
      index: true,
    },
    current_streak: {
      type: Number,
      default: 0,
      min: [0, 'Current streak cannot be negative'],
    },
    longest_streak: {
      type: Number,
      default: 0,
      min: [0, 'Longest streak cannot be negative'],
    },
    last_active_date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: 'updated_at',
    },
    versionKey: false,
  },
);

const DailyStreak = mongoose.model('DailyStreak', dailyStreakSchema);

export default DailyStreak;
