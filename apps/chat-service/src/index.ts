import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

for (const file of ['.env.development', '.env.local', '.env.development.local']) {
  const localFile = path.resolve(process.cwd(), file);
  if (fs.existsSync(localFile)) dotenv.config({ path: localFile, override: true });
  const rootFile = path.resolve(process.cwd(), '../../', file);
  if (fs.existsSync(rootFile)) dotenv.config({ path: rootFile, override: true });
}

import cors from 'cors';
import express from 'express';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { chatRouter } from './routes/chat.js';
import { healthRouter } from './routes/health.js';
import { loggingMiddleware } from './middleware/loggingMiddleware.js';
import { attachUserContext } from './middleware/attachUserContext.js';
import { requireGatewaySecret } from './middleware/requireGatewaySecret.js';

import { streamWorker } from './lib/streamWorker.js';

const PORT = process.env.PORT ?? 3001;

const app = express();
app.use(
  cors({
    origin: process.env.WEB_APP_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(loggingMiddleware);

app.use(healthRouter);
app.use('/api/v1/chat', requireGatewaySecret, attachUserContext, chatRouter);

app.use(errorHandler);

app.listen(PORT, async () => {
  logger.info(`Chat service running on port ${PORT}`);
  try {
    await streamWorker.start();
  } catch (err) {
    logger.error({ err }, 'Failed to start stream worker');
  }
});
