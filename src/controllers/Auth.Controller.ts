import { Request, Response, NextFunction, RequestHandler } from "express";
import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { UserModel } from "../models/user.Models";
import { generateAndSendOtp, verifyOtp } from "../services/otp";
import { sendSuccess, sendError } from "../utils/apiResponse";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";

// 1. Request OTP
const requestOtp: RequestHandler = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, "Pls Provide Email To Send Email", 401);
    await generateAndSendOtp(email);
    return sendSuccess(res, null, "OTP sent to email", 200);
  } catch (err: any) {
    return sendError(res, err.message || "Failed to send OTP", 500, err);
  }
};

// 2. Verify OTP
const verifyOtpHandler: RequestHandler = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    await verifyOtp(email, code);
    return sendSuccess(res, null, "OTP verified", 200);
  } catch (err: any) {
    return sendError(res, err.message || "OTP verification failed", 400, err);
  }
};

// 3. Signup after OTP verified
const signup: RequestHandler = async (req, res, next) => {
  try {
    const { email, code, password, name } = req.body;
    const missingFields = [];
    if (!email) missingFields.push("email");
    if (!code) missingFields.push("code");
    if (!password) missingFields.push("password");
    if (!name) missingFields.push("name");
    if (missingFields.length > 0) {
      return sendError(
        res,
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );
    }

    await verifyOtp(email, code);

    const hash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      email,
      password: hash,
      name,
      emailVerified: true,
    });
    if (!user) {
      return sendError(res, "Error While Creating User Pls Try Again", 501);
    }
    const payload = { userId: user._id as string, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    user.refreshTokens.push(refreshToken);
    await user.save();
    const userWithoutPassword = user.toObject();
    delete (userWithoutPassword as { password?: string }).password;

    return sendSuccess(
      res,
      {
        user: {
          _id: userWithoutPassword._id,
          name: userWithoutPassword.name,
          email: userWithoutPassword.email,
        },
        accessToken,
        refreshToken,
      },
      "Signin Successful",
      201
    );
  } catch (err: any) {
    console.log("error", err);
    return sendError(res, err.message || "Signup failed", 400, err);
  }
};

// 1. Login route (email + password)
const login: RequestHandler = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password)
      sendError(res, "Pls Provide Email Or Password", 401);
    const user = (await UserModel.findOne({ email })) as InstanceType<
      typeof UserModel
    > | null;
    if (!user)
      return sendError(res, "Invalid credentials Email Not Found", 404);

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return sendError(res, "Invalid credentials Wrong Password", 401);

    // NEW: reject if already logged in elsewhere
    if (user.activeSession) {
      return sendError(
        res,
        "You are already logged in on another device. Log out there first.",
        409
      );
    }
    const payload = {
      userId: (user._id as Types.ObjectId).toString(),
      email: user.email,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // NEW: set this as the only valid session
    user.refreshTokens = [refreshToken];
    user.activeSession = refreshToken;
    await user.save();

    const Cleaneduser = user.toObject();
    delete (Cleaneduser as { password?: string }).password;
    delete (Cleaneduser as { refreshTokens?: Array<any> }).refreshTokens;
    return sendSuccess(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          _id: Cleaneduser._id,
          name: Cleaneduser.name,
          email: Cleaneduser.email,
        },
      },
      "Login successful",
      200
    );
  } catch (err: any) {
    return sendError(res, err.message, 500, err);
  }
};

// 2. Refresh access token
const refreshTokenHandler: RequestHandler = async (req, res, next) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) return sendError(res, "Refresh token required", 400);
    const payload = verifyRefreshToken(refreshToken);

    // find user and check token
    const user = await UserModel.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return sendError(res, "Invalid refresh token", 403);
    }

    // optionally rotate tokens
    user.refreshTokens = user.refreshTokens.filter((rt) => rt !== refreshToken);
    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      email: payload.email,
    });
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    const newAccessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
    });
    const Cleaneduser = user.toObject();
    delete (Cleaneduser as { password?: string }).password;
    delete (Cleaneduser as { refreshTokens?: Array<any> }).refreshTokens;
    return sendSuccess(
      res,
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          _id: Cleaneduser._id,
          name: Cleaneduser.name,
          email: Cleaneduser.email,
        },
      },
      "Token refreshed",
      200
    );
  } catch (err: any) {
    return sendError(res, "Could not refresh token", 403, err);
  }
};

// 3. Logout route
const logout: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) return sendError(res, "Refresh token required", 400);

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return sendError(res, "Invalid refresh token", 403);
    }
    const user = await UserModel.findById(payload.userId);
    if (!user) return sendError(res, "Invalid refresh token", 403);

    // NEW: remove session
    user.refreshTokens = [];
    user.activeSession = null;
    await user.save();

    return sendSuccess(res, null, "Logged out successfully", 200);
  } catch (err: any) {
    return sendError(res, "Logout failed", 500, err);
  }
};

//4.Email varification
const checkEmailExists: RequestHandler = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }
    res.status(200).json({ message: "Email is available" });
  } catch (err) {
    next(err);
  }
};

export {
  requestOtp,
  login,
  logout,
  signup,
  refreshTokenHandler,
  verifyOtpHandler,
  checkEmailExists,
};
