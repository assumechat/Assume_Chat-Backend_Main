import express, { Request, Response, NextFunction } from 'express';
import logger from './middleware/logger';
import healthRouter from './routes/health';
import AuthRouter from './routes/auth.Routes';

import { connectDB } from './utils/db';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
    await connectDB();

    const app = express();
    const PORT = process.env.PORT || 3000;

    // ─── BODY PARSERS ─────────────────────────────────────────────────────────────
    app.use(express.json());                          // <— parses application/json
    app.use(express.urlencoded({ extended: true }));  // <— parses form submissions

    // ─── LOGGING ─────────────────────────────────────────────────────────────────
    app.use(logger);

    // ─── ROUTES ──────────────────────────────────────────────────────────────────
    app.use('/health', healthRouter);
    app.use('/Auth', AuthRouter);
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
