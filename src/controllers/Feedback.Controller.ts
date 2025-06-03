import { Request, Response } from "express";
import { FeedbackModel } from "../models/Feedback.Models";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { Types } from "mongoose";

export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { feedbackBy, feedbackTo, comment, rating } = req.body;
    const missingFields: string[] = [];

    if (!feedbackBy) missingFields.push('feedbackBy');
    if (!feedbackTo) missingFields.push('feedbackTo');
    if (!comment) missingFields.push('comment');
    if (!rating) missingFields.push('rating');
    // console.log(feedbackBy , feedbackTo , comment , rating);
    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    if (!Types.ObjectId.isValid(feedbackBy) || !Types.ObjectId.isValid(feedbackTo)) {
      return sendError(res, 'Invalid feedbackBy or feedbackTo format', 400);
    }
    await FeedbackModel.create({ feedbackBy, feedbackTo, comment, rating });
    return sendSuccess(res, {}, 'Feedback submitted successfully!', 201);
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    return sendError(res, error.message || 'Error submitting feedback', 400, error);
  }
};
