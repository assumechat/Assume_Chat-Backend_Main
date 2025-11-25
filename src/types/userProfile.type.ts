// src/models/UserProfile.ts
import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enumerated set of interests. Users can select multiple.
 */
export enum Interest {
  TECHNOLOGY    = 'technology',
  CREATIVITY    = 'creativity',
  MUSIC         = 'music',
  MOVIES        = 'movies',
  LITERATURE    = 'literature',
  TELEVISION    = 'television',
}

/**
 * Connection preference for matching with other students. Single select.
 */
export enum ConnectionPreference {
  SAME_UNIVERSITY      = 'same_university',
  DIFFERENT_UNIVERSITY = 'different_university',
  SAME_MAJOR           = 'same_major',
  DIFFERENT_MAJOR      = 'different_major',
  RANDOM               = 'random',
}

/**
 * UserProfile document interface
 */
export interface IUserProfile extends Document {
  userId: Types.ObjectId;                 // Reference to the User
  college?: string;                       // Name of college (if applicable)
  yearOfStudy: number;                    // Numeric year (e.g., 1, 2, 3)
  interests: Interest[];                  // Multi-select interests
  connectionPreference: ConnectionPreference; // Single-select connection rule
  createdAt: Date;
  updatedAt: Date;
}