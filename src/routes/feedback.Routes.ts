import express from "express";
import { getAllfeedback, isFeedbackBurst, submitFeedback } from "../controllers/Feedback.Controller";

const router = express.Router();
//1. feedback
router.post("/submit-feedback", submitFeedback);

//2.feedback fetch for unispace
router.get("/get-feedback",getAllfeedback);

//3.burst feedback
router.post("/burst-feedback" , isFeedbackBurst);

export default router;