import express from "express";
import { submitFeedback, submitReport } from "../controllers/Feedback.Controller";

const router = express.Router();
//1. feedback
router.post("/submit-feedback" , submitFeedback);

//2.report
router.post("/submit-report" , submitReport);


export default router;