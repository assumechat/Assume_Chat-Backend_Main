import { Schema, Document, model, Types } from "mongoose";

interface UserReport extends Document {
  reportTo: Types.ObjectId;
  reasons: string;
  details: string;
}

const ReportSchema = new Schema<UserReport>(
  {
    reportTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reasons: { type: String, required: true },
    details: { type: String },
  },
  { timestamps: true }
);

export const ReportModel = model<UserReport>('Report', ReportSchema);
