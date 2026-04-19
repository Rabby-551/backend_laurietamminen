import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    daily_step_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyStep',
      required: [true, 'Daily step reference is required'],
    },
    category: {
      type: String,
      enum: ['walking', 'running'],
      required: [true, 'Category is required'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    entry_time: {
      type: Date,
      default: Date.now,
      required: true,
    },
    total_steps_at_entry: {
      type: Number,
      required: [true, 'Total steps at entry is required'],
      min: [0, 'Total steps cannot be negative'],
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

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
