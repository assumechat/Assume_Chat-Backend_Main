import { Router } from "express";
import {
  GetAllForms,
  getNumForms,
  getUserByEmail,
  PostForm,
} from "../controllers/EarlyAccess.Controller";

const router = Router();

router.post("/", PostForm);
router.get("/", GetAllForms);
router.get("/number", getNumForms);
router.post("/getUserByEmail", getUserByEmail);
export default router;
