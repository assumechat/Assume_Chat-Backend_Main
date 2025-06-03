import { Schema, Document, model , Types } from "mongoose";

interface UserReport extends Document {
  // userId: Types.ObjectId;
  peerId: Types.ObjectId;
  reasons : string;
  details: string;
  date: Date;
}

const ReportSchema = new Schema<UserReport>({
  //userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  peerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
  reasons : { type: String, required: true },
  details: { type: String },
  date: { type: Date, default: Date.now },
});

export const ReportModel = model<UserReport>('Report', ReportSchema);
