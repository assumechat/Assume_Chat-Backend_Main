import { Request, Response } from "express";
import { FeedbackModel } from "../models/Feedback.Models";
import { ReportModel } from "../models/Report.Models";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { Types } from "mongoose";

// 1. Feedback
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { feedbackBy,feedbackTo,  comment, rating } = req.body;
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
      return sendError(res, 'Invalid userId or peerId format', 400);
    }
    const feedback = new FeedbackModel({feedbackBy , feedbackTo , comment, rating });
    console.log(feedback);
    await feedback.save();
    return sendSuccess(res, 'Feedback submitted successfully!');
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    return sendError(res, error.message || 'Error submitting feedback', 400, error);
  }
};

// 2. Report
export const submitReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const {  peerId, reasons, details } = req.body;
    const missingFields = [];
    console.log(  peerId , reasons , details);
    if (!peerId) missingFields.push('peerId');
    if (!reasons) missingFields.push('reasons');

    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }
    const report = new ReportModel({  peerId , reasons, details });
    await report.save();
    return sendSuccess(res, 'Report submitted successfully!');
  } catch (error: any) {
    console.error("Error submitting report:", error);
    return sendError(res, error.message || 'Error submitting report', 400, error);
  }
};
