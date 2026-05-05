import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email address",
      },
    },
    phone_number: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "client", "admin"],
      default: "user",
    },
    profile_picture_url: {
      type: String,
      default: "",
    },
    profile_picture_public_id: {
      type: String,
      default: "",
    },
    date_of_birth: {
      type: Date,
    },
    client_id: {
      type: String,
      sparse: true,
      trim: true,
      default: null,
    },
    height: {
      type: Number,
      min: [0, "Height cannot be negative"],
    },
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
    },
    height_unit: {
      type: String,
      enum: ["cm", "feet"],
      default: "cm",
    },
    weight_unit: {
      type: String,
      enum: ["kg", "lbs"],
      default: "kg",
    },
    step_goal: {
      type: Number,
      default: 10000,
      min: [1, "Step goal must be at least 1"],
    },
    location_permission: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    otp: {
      type: String,
      select: false,
      default: null,
    },
    otp_expires_at: {
      type: Date,
      select: false,
      default: null,
    },
    otp_verified: {
      type: Boolean,
      select: false,
      default: false,
    },
    refresh_token: {
      type: String,
      select: false,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.refresh_token;
        delete ret.otp;
        delete ret.otp_expires_at;
        delete ret.otp_verified;
        return ret;
      },
    },
  },
);

userSchema.pre("save", async function savePassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(
  candidatePassword,
) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
