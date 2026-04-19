import mongoose from 'mongoose';

const triggerTokenSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      trim: true,
    },
    expires_at: {
      type: Date,
      required: [true, 'Expiration time is required'],
      index: true,
    },
    is_used: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
  },
);

const TriggerToken = mongoose.model('TriggerToken', triggerTokenSchema);

export default TriggerToken;
