// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';
import { UserModel } from '../models/user.Models';
import { UserProfileModel } from '../models/userProfile.Models';
import { IUser } from '../types/user.type';
import { Types } from 'mongoose';

/**
 * Extend Express Request to include authenticated user and profile
 */
export interface AuthRequest extends Request {
    user?: any;
    profile?: any;
}

export interface IUserLean extends IUser {
    _id:string | Types.ObjectId;
}


/**
 * Middleware to protect routes and attach user & profile to req
 */
export async function authGuard(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 'Unauthorized: No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = verifyAccessToken(token);
        const user = await UserModel.findById(payload.userId) ;
        if (!user) {
            return sendError(res, 'Unauthorized: User not found', 401);
        }
        // Attach user to request
        // req.user = user;
        req.user= {
            ...user.toObject(),
            id:( user._id as any ).toString(),
        }

        // Optionally load user profile
        const profile = await UserProfileModel.findOne({ userId: user._id });
        req.profile = profile;

        return next();
    } catch (err: any) {
        return sendError(res, 'Unauthorized: Invalid token', 401, err);
    }
}


