import mongoose from "mongoose";

const AppFeedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "bug",
        "feedback",
        "early_access",
        "enhancement",
        "feature",
        "other",
      ],
      required: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    metadata: {
      browser: String,
      os: String,
      pageUrl: String,
      appVersion: String,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    capped: { size: 1048576, max: 500 }, // ~1MB or 500 docs
  }
);

export default mongoose.models.AppFeedback ||
  mongoose.model("AppFeedback", AppFeedbackSchema);
