import { Request, Response } from "express";
import { FeedbackModel } from "../models/Feedback.Models";
import { ReportModel } from "../models/Report.Models";

//1. feedback
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, comment, rating } = req.body;
    //console.log(name  , comment , rating);
    if (!name  || !comment || !rating) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const feedback = new FeedbackModel({ name,  comment, rating , date: new Date() });
   // console.log(feedback);
    await feedback.save();

    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


//2.Report

export const submitReport = async(req : Request , res : Response) : Promise<void> => {
  try{
    const { userId , name , reasons , details }= req.body;
    console.log(userId , name , reasons , details);
    if(!name || !userId || !reasons ) {
      res.status(400).json({ error: "All feilds are required"});
      return;
    }
    const report = new ReportModel({ userId , name , reasons , details , date: new Date() });
    console.log(report);
    await report.save();
    res.status(201).json({ message: "Report submitted successfullly"});
  }
  catch(error){
    console.error("error submitting report" , error);
    res.status(500).json({error : "Internal server error"});
  }
}

