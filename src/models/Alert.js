import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client is required"],
      index: true,
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, "Latitude is required"],
      },
      lng: {
        type: Number,
        required: [true, "Longitude is required"],
      },
    },
    accuracy: {
      type: Number,
      min: [0, "Accuracy cannot be negative"],
      default: null,
    },
    street_address: {
      type: String,
      trim: true,
      default: "",
    },
    signal_strength: {
      type: String,
      trim: true,
      default: "",
    },
    connection_state: {
      type: String,
      trim: true,
      default: "",
    },
    device_id: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved"],
      default: "pending",
    },
    last_sync_at: {
      type: Date,
      default: Date.now,
    },
    dob: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  },
);

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;
