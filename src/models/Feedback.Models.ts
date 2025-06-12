import { model, Document, Types, Schema } from 'mongoose';

export enum BurstStatus {
  TRUE = 'true',
  FALSE = 'false',
}

interface IFeedback extends Document {
  feedbackBy: Types.ObjectId;
  feedbackTo: Types.ObjectId;
  comment: string;
  rating: number;
  isBurst?: BurstStatus;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    feedbackBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    feedbackTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    isBurst: { type: String, enum: Object.values(BurstStatus), default: BurstStatus.FALSE, },
  },
  { timestamps: true }
);

export const FeedbackModel = model<IFeedback>('Feedback', FeedbackSchema);
