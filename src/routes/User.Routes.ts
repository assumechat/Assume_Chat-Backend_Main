import { Router } from "express";
import { updateUserPremium } from "../controllers/User.Controller";

const router = Router();

router.put("/updatePremium", updateUserPremium);

export default router;
