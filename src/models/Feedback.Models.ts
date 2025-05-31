import {model ,Document , Types, Schema} from  'mongoose';

interface IFeedback extends Document {
  name: string;
  comment: string;
  rating: number;
  date: Date;
}
const FeedbackSchema = new Schema({
    name: { type: String, required: true },
    comment: { type: String , required: true},
    rating: { type: Number, required: true, min: 1, max: 5 },
    date: {type : Date , required: true , default: Date.now},
},{ timestamps: true });

export const FeedbackModel = model<IFeedback>('Feedback', FeedbackSchema);
