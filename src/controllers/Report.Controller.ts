import { Request, Response } from "express";
import { ReportModel } from "../models/Report.Models";
import { sendError, sendSuccess } from "../utils/apiResponse";

export const submitReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { peerId, reasons, details } = req.body;
    const missingFields = [];
    //console.log(peerId, reasons, details);
    if (!peerId) missingFields.push("peerId");
    if (!reasons) missingFields.push("reasons");

    if (missingFields.length > 0) {
      return sendError(
        res,
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );
    }
    await ReportModel.create({ reportTo: peerId, reasons, details });
    console.log(peerId);
    return sendSuccess(res, {}, "Report submitted successfully!", 201);
  } catch (error: any) {
    console.error("Error submitting report:", error);
    return sendError(
      res,
      error.message || "Error submitting report",
      400,
      error
    );
  }
};
