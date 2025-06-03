import express from "express";
import { submitReport } from "../controllers/Report.Controller";

const router = express.Router();

router.post("/submit-report", submitReport);


export default router;