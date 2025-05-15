import express, { Request, Response, NextFunction } from 'express';
import logger from './middleware/logger';
import healthRouter from './routes/health.Route';
import AuthRouter from './routes/auth.Routes';
import userProfileRouter from './routes/userProfile.Route';
import { connectDB } from './utils/db';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

async function bootstrap() {
    await connectDB();

    const app = express();
    const PORT = process.env.PORT || 3001;

    // ─── ENABLE CORS ─────────────────────────────────────────────────────────────
    app.use(cors({
        origin: 'http://localhost:3000', // allow frontend origin
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));

    // ─── BODY PARSERS ─────────────────────────────────────────────────────────────
    app.use(express.json());                          // <— parses application/json
    app.use(express.urlencoded({ extended: true }));  // <— parses form submissions

    // ─── LOGGING ─────────────────────────────────────────────────────────────────
    app.use(logger);

    // ─── ROUTES ──────────────────────────────────────────────────────────────────
    app.use('/health', healthRouter);
    app.use('/Auth', AuthRouter);
    app.use('/userProfile', userProfileRouter);
    app.get('/', (_req: Request, res: Response) => {
        res.send({ message: 'Assume Chat API up and running!' });
    });


    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error(err);
        res.status(500).send({ error: 'Something went wrong' });
    });

    app.listen(PORT, () => {
        console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
}

bootstrap();
