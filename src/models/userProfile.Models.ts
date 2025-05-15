import { Schema, model, Document, Types } from 'mongoose';
import { IUserProfile, Interest, ConnectionPreference } from '../types/userProfile.type';

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    college: {
      type: String,
      trim: true,
    },
    yearOfStudy: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    interests: {
      type: [String],
      enum: Object.values(Interest),
      default: [],
    },
    connectionPreference: {
      type: String,
      enum: Object.values(ConnectionPreference),
      required: true,
    },
  },
  { timestamps: true }
);

export const UserProfileModel = model<IUserProfile>('UserProfile', UserProfileSchema);
