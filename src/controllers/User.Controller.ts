import { RequestHandler } from "express";
import { UserModel } from "../models/user.Models";
import { sendError, sendSuccess } from "../utils/apiResponse";

export const updateUserPremium: RequestHandler<{ id: string }> = async (
  req,
  res,
  next
) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, "Please provide all the required fields", 400);
    }
    const user = await UserModel.findOne({ email: email });
    if (!user) {
      return sendError(res, "user not found", 404);
    }
    const premiumExpiryData = Date.now() + 30 * 24 * 60 * 60 * 1000; //adding 30 days to current date
    const updateUser = await UserModel.findByIdAndUpdate(user._id, {
      isPremium: true,
      premiumExpiry: premiumExpiryData,
      premiumTier: "plus",
    });
    if (!updateUser) {
      return sendError(res, "error updating user", 400);
    }
    const updatedUser = await UserModel.findOne({ email: email });

    return sendSuccess(
      res,
      {
        user: {
          id: user?._id,
        },
      },
      "User now have premium for 30days",
      200
    );
  } catch (error: any) {
    return sendError(res, error.message || "Something went wrong", 500, error);
  }
};
