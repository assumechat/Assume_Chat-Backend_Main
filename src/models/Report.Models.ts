import { Schema, Document, model } from "mongoose";

interface UserReport extends Document {
  userId: string;
  name: string;
  reasons : string;
  details: string;
  date: Date;
}

const ReportSchema = new Schema<UserReport>({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  reasons : { type: String, required: true },
  details: { type: String },
  date: { type: Date, default: Date.now },
});

export const ReportModel = model<UserReport>('Report', ReportSchema);
