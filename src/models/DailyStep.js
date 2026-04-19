import mongoose from 'mongoose';
import { startOfUtcDay } from '../utils/date.js';

const dailyStepSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    steps: {
      type: Number,
      required: [true, 'Steps are required'],
      min: [0, 'Steps cannot be negative'],
    },
    date: {
      type: Date,
      default: () => startOfUtcDay(new Date()),
      required: true,
      set: (value) => startOfUtcDay(value),
    },
    intensity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    versionKey: false,
  },
);

dailyStepSchema.index({ user_id: 1, date: 1 }, { unique: true });

const DailyStep = mongoose.model('DailyStep', dailyStepSchema);

export default DailyStep;
