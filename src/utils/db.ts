// src/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI!;
if (!uri) {
  console.error('❌ MONGODB_URI not set in .env');
  process.exit(1);
}

export async function connectDB() {
  try {
    // optional: suppress deprecation warnings
    mongoose.set('strictQuery', true);

    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}
