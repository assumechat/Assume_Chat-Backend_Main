import { Router } from "express";
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
} from "../controllers/AppFeedback.Controller";

const router = Router();

router.post("/", createFeedback);
router.get("/", getAllFeedback);
router.get("/:id", getFeedbackById);
router.patch("/:id/status", updateFeedbackStatus);
router.delete("/:id", deleteFeedback);

export default router;
