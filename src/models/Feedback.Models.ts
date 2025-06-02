import { model, Document, Types, Schema } from 'mongoose';

interface IFeedback extends Document {
  feedbackBy: Types.ObjectId;
 feedbackTo: Types.ObjectId;
  comment: string;
  rating: number;
}

const FeedbackSchema = new Schema<IFeedback>({
  feedbackBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  feedbackTo: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
  comment: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });

export const FeedbackModel = model<IFeedback>('Feedback', FeedbackSchema);
