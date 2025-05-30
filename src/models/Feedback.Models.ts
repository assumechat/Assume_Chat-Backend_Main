import {model ,Document , Types, Schema} from  'mongoose';

interface IFeedback extends Document {
  name: string;
  comment: string;
  rating: number;
}
const FeedbackSchema = new Schema({
    name: { type: String, required: true },
    comment: { type: String , required: true},
    rating: { type: Number, required: true, min: 1, max: 5 },
},{ timestamps: true });

export const FeedbackModel = model<IFeedback>('Feedback', FeedbackSchema);
