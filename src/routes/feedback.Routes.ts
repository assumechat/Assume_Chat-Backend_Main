import express from "express";
import {
  getfeedbackById,
  getfeedbackByUserId,
  isFeedbackBurst,
  submitFeedback,
} from "../controllers/Feedback.Controller";
import { authGuard } from "../middleware/Auth.middleware";

const router = express.Router();
//1. feedback
router.post("/submit-feedback", submitFeedback);

//2.feedback fetch for unispace
router.get("/get-feedback", authGuard, getfeedbackByUserId);

//3.burst feedback
router.post("/burst-feedback", authGuard, isFeedbackBurst);

router.get("/get-feedbackById/:feedbackId", getfeedbackById);

export default router;
