import { RequestHandler } from "express";
import { Types } from "mongoose";
import validator from "validator";
import AppFeedback from "../models/AppFeedback.Model";
import { sendSuccess, sendError } from "../utils/apiResponse";

const allowedTypes = [
  "bug",
  "feedback",
  "feature",
  "early_access",
  "enhancement",
  "feature",
  "other",
] as const;
const allowedStatuses = ["pending", "reviewed", "resolved"] as const;

export const createFeedback: RequestHandler = async (req, res, next) => {
  try {
    const { type, email, title, description, metadata } = req.body;

    // Required-fields validation
    const missing: string[] = [];
    if (!type) missing.push("type");
    if (!title) missing.push("title");
    if (!description) missing.push("description");
    if (missing.length) {
      return sendError(
        res,
        `Missing required fields: ${missing.join(", ")}`,
        400
      );
    }

    // Enum validation
    if (!allowedTypes.includes(type)) {
      return sendError(
        res,
        `Invalid type. Allowed values: ${allowedTypes.join(", ")}`,
        400
      );
    }

    // Optional email format check
    if (email && !validator.isEmail(email)) {
      return sendError(res, "Invalid email address", 400);
    }

    // Length validations
    if (title.length > 100) {
      return sendError(res, "Title must be <= 100 characters", 400);
    }
    if (description.length > 1000) {
      return sendError(res, "Description must be <= 1000 characters", 400);
    }

    const fb = await AppFeedback.create({
      type,
      email,
      title,
      description,
      metadata,
    });
    return sendSuccess(res, fb, "AppFeedback submitted successfully", 201);
  } catch (err: any) {
    return sendError(
      res,
      err.message || "Failed to submit AppFeedback",
      500,
      err
    );
  }
};

export const getAllFeedback: RequestHandler = async (req, res, next) => {
  try {
    const { type, status } = req.query as Record<string, string>;
    const filter: Record<string, string> = {};

    if (type) {
      if (!allowedTypes.includes(type as any)) {
        return sendError(
          res,
          `Invalid type filter. Allowed: ${allowedTypes.join(", ")}`,
          400
        );
      }
      filter.type = type;
    }
    if (status) {
      if (!allowedStatuses.includes(status as any)) {
        return sendError(
          res,
          `Invalid status filter. Allowed: ${allowedStatuses.join(", ")}`,
          400
        );
      }
      filter.status = status;
    }

    const list = await AppFeedback.find(filter)
      .sort({ createdAt: -1 })
      .limit(500);
    return sendSuccess(
      res,
      list,
      "AppFeedback list retrieved successfully",
      200
    );
  } catch (err: any) {
    return sendError(
      res,
      err.message || "Failed to retrieve AppFeedback",
      500,
      err
    );
  }
};

export const getFeedbackById: RequestHandler<{ id: string }> = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid feedback ID", 400);
    }

    const fb = await AppFeedback.findById(id);
    if (!fb) {
      return sendError(res, "AppFeedback not found", 404);
    }

    return sendSuccess(res, fb, "AppFeedback retrieved successfully", 200);
  } catch (err: any) {
    return sendError(
      res,
      err.message || "Failed to retrieve AppFeedback",
      500,
      err
    );
  }
};

export const updateFeedbackStatus: RequestHandler<{ id: string }> = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid feedback ID", 400);
    }
    if (!status) {
      return sendError(res, "Status is required", 400);
    }
    if (!allowedStatuses.includes(status as any)) {
      return sendError(
        res,
        `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
        400
      );
    }

    const fb = await AppFeedback.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!fb) {
      return sendError(res, "Feedback not found", 404);
    }

    return sendSuccess(res, fb, "Feedback status updated successfully", 200);
  } catch (err: any) {
    return sendError(
      res,
      err.message || "Failed to update feedback status",
      500,
      err
    );
  }
};

export const deleteFeedback: RequestHandler<{ id: string }> = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid feedback ID", 400);
    }

    const fb = await AppFeedback.findByIdAndDelete(id);
    if (!fb) {
      return sendError(res, "Feedback not found", 404);
    }

    return sendSuccess(res, null, "Feedback deleted successfully", 200);
  } catch (err: any) {
    return sendError(res, err.message || "Failed to delete feedback", 500, err);
  }
};
