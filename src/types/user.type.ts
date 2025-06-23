import mongoose, { Document, Types } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  emailVerified: Boolean;
  college?: string;
  userDataId?: Types.ObjectId;
  createdAt: Date;
  refreshTokens: string[];
  activeSession: string | null;
  updatedAt: Date;
}
