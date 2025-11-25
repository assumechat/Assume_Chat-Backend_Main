import { Router } from 'express';
import {
    requestOtp,
    login,
    logout,
    signup,
    refreshTokenHandler,
    verifyOtpHandler,
    checkEmailExists,
} from "../controllers/Auth.Controller"
const router = Router();

router.post('/request-otp', requestOtp);
// router.post('/verify-otp', verifyOtpHandler);
router.post('/check-email', checkEmailExists);
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logout);

export default router;
