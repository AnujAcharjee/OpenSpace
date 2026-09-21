import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Request, type Response } from 'express';
import { roomRouter } from './routes/room.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { userRouter } from './routes/user.js';
import { loggingMiddleware } from './middleware/loggingMiddleware.js';
import { authRouter } from './routes/auth.js';
import { requireGatewaySecret } from './middleware/requireGatewaySecret.js';
import { attachUserContext } from './middleware/attachUserContext.js';

const PORT = process.env.PORT ?? 3003;

const app = express();

app.use(
  cors({
    origin: process.env.WEB_APP_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(loggingMiddleware);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});


app.use('/api/v1/auth', requireGatewaySecret, authRouter);
app.use('/api/v1/users', requireGatewaySecret, attachUserContext, userRouter);
app.use('/api/v1/rooms', requireGatewaySecret, attachUserContext, roomRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`HTTP service running on port: ${PORT}`);
});
