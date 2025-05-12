// src/utils/response.ts
import { Response } from 'express';

export interface ApiSuccess<T = any> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  error?: any;
}

/**
 * Send a standardized successful API response
 * @param res Express Response object
 * @param data Payload to return
 * @param message Optional custom message (default: 'Success')
 * @param statusCode HTTP status code (default: 200)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): void {
  res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  });
}

/**
 * Send a standardized error API response
 * @param res Express Response object
 * @param message Error message
 * @param statusCode HTTP status code (default: 500)
 * @param error Optional additional error details
 */
export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  error?: any
): void {
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error,
  });
}
