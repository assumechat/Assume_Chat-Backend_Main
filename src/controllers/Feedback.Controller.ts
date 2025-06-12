import { Request, Response } from "express";
import { BurstStatus, FeedbackModel } from "../models/Feedback.Models";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { Types } from "mongoose";
import { error } from "console";

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

//get feedback for unispace
export const getAllfeedback=async( req: Request , res: Response): Promise<void>=>{
  try{
    const { userId} = req.query;
    if(!userId) {
      return sendError(res , userId || "Error fetching userid");
    }
    const filter: any = {
      feedbackBy: userId,
      isBurst: BurstStatus.FALSE,
    };
    const feedback= await FeedbackModel.find(filter)
    .populate("feedbackBy", "name")
    .populate("feedbackTo", "name")
    .sort({ createdAt :-1})
     .lean();
    //console.log(feedback);
    return sendSuccess(res , feedback , "feedback fetched successfullt!" , 201);
  }
  catch(err: any){
    console.error("Error fetching feedback:", err);
    return sendError(res, err.message || "Error fetching feedback" , 400, err);
  }
}

//handle burst
export const isFeedbackBurst = async (req: Request , res: Response) : Promise<void> =>{
  try{
    const { id} =req.body;
    console.log(id);
    if(!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid or missing feedbackId", 400);
    }
    const updatedFeedback = await FeedbackModel.findByIdAndUpdate( id , { isburst : BurstStatus.TRUE},
      {new:true}
    ).lean();
    console.log(updatedFeedback);
    if(!updatedFeedback) {
      return sendError(res , "Card not Found" , 404);
    }
    return sendSuccess(res , updatedFeedback , "Card marked as burst" , 200);
  }
  catch (error: any) {
    console.error("Burst error:", error);
    return sendError(res, error.message || "Error marking as burst", 500, error);
  }
}