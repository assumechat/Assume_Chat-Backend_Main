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
import { initializeQueueSocket } from "./sockets/queueSocket";
import { initializeChatSocket } from "./sockets/chatSocket";
import feedbackRouter from "./routes/feedback.Routes";
import ReportRouter from "./routes/report.Routes";
import AppFeedbackRouter from "./routes/AppFeedback.Routes";
import EarlyAccessForm from "./routes/EarlyAccessForm.Routes";
import UserRoutes from "./routes/User.Routes";
async function bootstrap() {
  await connectDB();

  const app = express();
  const PORT = process.env.PORT || 3001;
  // ─── ENABLE CORS ─────────────────────────────────────────────────────────────
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:3002"];

  app.use(
    cors({
      origin: corsOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
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
    cors: { origin: "*" }, // adjust in prod
  });

  // initialize your /queue and /chat namespaces
  initializeQueueSocket(io);
  initializeChatSocket(io);

  // start listening
  httpServer.listen(PORT, () =>
    console.log(`🚀 Server (HTTP + WS) listening on http://localhost:${PORT}`)
  );
}

bootstrap().catch(console.error);
