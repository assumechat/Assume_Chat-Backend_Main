import { Request, Response } from "express";
import { FeedbackModel } from "../models/Feedback.Models";

export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, comment, rating } = req.body;
    console.log(name  , comment , rating);
    if (!name  || !comment || !rating) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const feedback = new FeedbackModel({ name,  comment, rating });
    await feedback.save();

    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
