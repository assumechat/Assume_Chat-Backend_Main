// src/controllers/userProfileController.ts
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { UserProfileModel } from '../models/userProfile.Models';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { IUserProfile } from "../types/userProfile.type"
import { UserModel } from '../models/user.Models';
/** Create or update user profile */
export async function upsertProfile(req: Request, res: Response, next: NextFunction) {
  const userId = req.body.userId || req.params.userId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return sendError(res, 'Valid userId is required', 400);
  }
  try {
    const data = req.body as Partial<IUserProfile>;
    // upsert: if exists, update; else create
    const profile = await UserProfileModel.findOneAndUpdate(
      { userId },
      { ...data, userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    //console.log(data);
    if (!profile) {
      return sendError(res, "Error While Createing UserProfile", 501)
    }
    const userUpdate = await UserModel.findByIdAndUpdate(userId, {
      userDataId: profile._id
    });
    return sendSuccess(res, profile, 'Profile saved');
  } catch (err: any) {
    console.log(err);
    return sendError(res, 'Failed to save profile', 500, err);
  }
}

/** Get profile by userId */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  const userId = req.params.userId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return sendError(res, 'Valid userId is required', 400);
  }
  try {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) return sendError(res, 'Profile not found', 404);
    return sendSuccess(res, profile, 'Profile fetched');
  } catch (err: any) {
    return sendError(res, 'Failed to fetch profile', 500, err);
  }
}

/** Delete profile by userId */
export async function deleteProfile(req: Request, res: Response, next: NextFunction) {
  const userId = req.params.userId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return sendError(res, 'Valid userId is required', 400);
  }
  try {
    await UserProfileModel.findOneAndDelete({ userId });
    return sendSuccess(res, null, 'Profile deleted');
  } catch (err: any) {
    return sendError(res, 'Failed to delete profile', 500, err);
  }
}
