import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import logger from "./middleware/logger";
import healthRouter from "./routes/health.Route";
import AuthRouter from "./routes/auth.Routes";
import userProfileRouter from "./routes/userProfile.Route";
import { connectDB } from "./utils/db";
import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { initializeQueueSocket } from "./sockets/queueSocket";
import { initializeChatSocket } from "./sockets/chatSocket";
import { initializeScheduler } from "./utils/scheduler";
import feedbackRouter from "./routes/feedback.Routes";
import ReportRouter from "./routes/report.Routes";
import AppFeedbackRouter from "./routes/AppFeedback.Routes";
import EarlyAccessForm from "./routes/EarlyAccessForm.Routes";
import UserRoutes from "./routes/User.Routes";
import GameSessionRouter from "./routes/gameSession.routes";
async function bootstrap() {
  await connectDB();

  const app = express();
  const PORT = process.env.PORT || 3001;
  // ─── ENABLE CORS ─────────────────────────────────────────────────────────────
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim().replace(/^["']|["']$/g, ''))
    : ["http://localhost:3000", "http://localhost:3002"];

  // Helper function to check if origin is allowed (including Cloudflare tunnels)
  const isOriginAllowed = (origin: string | undefined): boolean => {
    if (!origin) return true; // Allow requests with no origin

    // Check exact match
    if (corsOrigins.includes(origin)) return true;

    // Allow Cloudflare tunnel URLs in development (trycloudflare.com)
    if (process.env.NODE_ENV !== 'production' && origin.includes('trycloudflare.com')) {
      console.log('✅ Allowing Cloudflare tunnel origin:', origin);
      return true;
    }

    return false;
  };

  console.log('🌐 CORS Origins configured:', corsOrigins);
  console.log('🚀 NODE_ENV:', process.env.NODE_ENV);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }

        // Log for debugging
        console.log('🚫 CORS blocked origin:', origin);
        console.log('✅ Allowed origins:', corsOrigins);
        callback(new Error('Not allowed by CORS'));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    })
  );

  // ─── BODY PARSERS ─────────────────────────────────────────────────────────────
  app.use(express.json()); // <— parses application/json
  app.use(express.urlencoded({ extended: true })); // <— parses form submissions

  // ─── LOGGING ─────────────────────────────────────────────────────────────────
  app.use(logger);

  // ─── ROUTES ──────────────────────────────────────────────────────────────────
  app.use("/health", healthRouter);
  app.use("/Auth", AuthRouter);
  app.use("/userProfile", userProfileRouter);
  app.use("/feedback", feedbackRouter);
  app.use("/report", ReportRouter);
  app.use("/app-feedback", AppFeedbackRouter);
  app.use("/early-access-form", EarlyAccessForm);
  app.use("/user", UserRoutes);
  app.use("/game-session", GameSessionRouter);
  app.get("/", (_req: Request, res: Response) => {
    res.send({ message: "Assume Chat API up and running!" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).send({ error: "Something went wrong" });
  });

  // create an HTTP server from Express
  const httpServer = http.createServer(app);

  // attach Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        console.log('🚫 Socket.IO CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'], // Support both transports
    allowEIO3: true, // Allow Engine.IO v3 clients
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Log socket connections for debugging
  io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.IO connection error:', err.message);
    console.error('   Details:', err.context);
  });

  // ─── REDIS ADAPTER FOR MULTI-INSTANCE SUPPORT ───────────────────────────────────
  // This allows multiple server instances to share socket connections and rooms
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    // Use ioredis for the adapter (more reliable with socket.io)
    const pubClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      console.error('❌ Redis Pub Client Error:', err.message);
    });
    subClient.on('error', (err) => {
      console.error('❌ Redis Sub Client Error:', err.message);
    });

    pubClient.on('connect', () => {
      console.log('✅ Redis Pub Client connecting...');
    });
    subClient.on('connect', () => {
      console.log('✅ Redis Sub Client connecting...');
    });

    pubClient.on('ready', () => {
      console.log('✅ Redis Pub Client ready');
    });
    subClient.on('ready', () => {
      console.log('✅ Redis Sub Client ready');
    });

    // Try to set up the adapter
    try {
      io.adapter(createAdapter(pubClient as any, subClient as any));
      console.log('✅ Redis adapter configured - multi-instance support enabled');
    } catch (adapterErr) {
      console.error('❌ Redis adapter setup failed:', adapterErr);
      console.log('⚠️  Running without Redis adapter (single instance only)');
    }
  } catch (err) {
    console.error('❌ Redis setup error:', err);
    console.log('⚠️  Running without Redis adapter (single instance only)');
    console.log('💡 To enable multi-instance support, ensure Redis is running and REDIS_URL is set');
  }

  // initialize your /queue and /chat namespaces
  initializeQueueSocket(io);
  initializeChatSocket(io);

  // initialize scheduler
  initializeScheduler();

  // start listening
  httpServer.listen(PORT, () =>
    console.log(`🚀 Server (HTTP + WS) listening on http://localhost:${PORT}`)
  );
}

bootstrap().catch(console.error);
