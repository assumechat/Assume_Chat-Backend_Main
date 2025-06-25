import { Schema, model, Document, Types } from "mongoose";
import { IUser } from "../types/user.type";

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    userDataId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    refreshTokens: { type: [String], default: [] },
    activeSession: { type: String, default: null },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>("User", UserSchema);
