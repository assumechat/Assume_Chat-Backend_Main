import { Request, Response } from "express";
import { FeedbackModel } from "../models/Feedback.Models";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/Auth.middleware";

export const submitFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { feedbackBy, feedbackTo, comment, rating } = req.body;
    const missingFields: string[] = [];

    if (!feedbackBy) missingFields.push("feedbackBy");
    if (!feedbackTo) missingFields.push("feedbackTo");
    if (!comment) missingFields.push("comment");
    if (!rating) missingFields.push("rating");
    if (missingFields.length > 0) {
      return sendError(
        res,
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );
    }

    if (
      !Types.ObjectId.isValid(feedbackBy) ||
      !Types.ObjectId.isValid(feedbackTo)
    ) {
      return sendError(res, "Invalid feedbackBy or feedbackTo format", 400);
    }
    await FeedbackModel.create({ feedbackBy, feedbackTo, comment, rating });
    return sendSuccess(res, {}, "Feedback submitted successfully!", 201);
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    return sendError(
      res,
      error.message || "Error submitting feedback",
      400,
      error
    );
  }
};

//get feedback for unispace
export const getfeedbackByUserId = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId || !Types.ObjectId.isValid(userId as string)) {
      return sendError(res, "Error fetching userid", 400);
    }
    const filter: any = {
      feedbackTo: new Types.ObjectId(userId as string),
      isBurst: false,
    };
    const feedback = await FeedbackModel.find(filter)
      .populate("feedbackBy", "name")
      .populate("feedbackTo", "name")
      .sort({ createdAt: -1 })
      .lean();
    if (!feedback) {
      return sendError(res, " error fetching feedback", 400);
    }
    return sendSuccess(res, feedback, "feedback fetched successfullt!", 201);
  } catch (err: any) {
    console.error("Error fetching feedback:", err);
    return sendError(res, err.message || "Error fetching feedback", 400, err);
  }
};

//handle burst toggle
export const isFeedbackBurst = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.body.id;
    // console.log(id);
    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid or missing feedbackId", 400);
    }
    const feedback = await FeedbackModel.findById(id);
    if (!feedback) {
      return sendError(res, "Feedback not found", 404);
    }
    feedback.isBurst = !feedback.isBurst; //toggle
    await feedback.save();
    return sendSuccess(
      res,
      feedback,
      `Feedback marked as ${feedback.isBurst} ? 'burst' : 'not burst`,
      200
    );
  } catch (error: any) {
    console.error("Burst error:", error);
    return sendError(
      res,
      error.message || "Error marking as burst",
      500,
      error
    );
  }
};
//get feedback by id
export const getfeedbackById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const feedbackId = req.params.feedbackId;
    if (!feedbackId) {
      return sendError(res, "Feedback id not found", 400);
    }
    const feedback = await FeedbackModel.findById(feedbackId);
    if (!feedback) {
      return sendError(res, "Feedback not found", 400);
    }
    return sendSuccess(res, feedback, "feedback found successfully", 200);
  } catch (error: any) {
    return sendError(
      res,
      error.message || "Error finding feedback",
      500,
      error
    );
  }
};
