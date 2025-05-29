import express from "express";
import { submitFeedback } from "../controllers/Feedback.Controller";

const router = express.Router();

router.post("/submit-feedback" , submitFeedback);

export default router;