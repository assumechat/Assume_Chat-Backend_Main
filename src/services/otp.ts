import { OtpModel, IOtp } from '../models/Otp.Models';
import { sendMail } from './email';
import { Types } from 'mongoose';

const OTP_LENGTH = 6;
const EXPIRY_MINUTES = 10;

export async function generateAndSendOtp(email: string, userId?: Types.ObjectId) {
  // create code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60000);

  // save OTP
  const otp = await OtpModel.create({ email, userId, code, expiresAt });

  // send email
  const html = `<p>Your verification code is <b>${code}</b>. It expires in ${EXPIRY_MINUTES} minutes.</p>`;
  // for prod 
  // await sendMail(email, 'Your OTP Code', html);
  console.log(`Testing ${code} SEND TO ${email}`)
  return otp;
}

export async function verifyOtp(email: string, code: string) {
  const otp = await OtpModel.findOne({ email, code, used: false });
  if (!otp) throw new Error('Invalid OTP');
  if (otp.expiresAt < new Date()) throw new Error('OTP expired');

  otp.used = true;
  await otp.save();

  return otp;
}
