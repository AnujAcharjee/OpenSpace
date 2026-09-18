import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { logger } from './lib/logger.js';
import { requestId } from './middleware/requestId.js';
import { loggingMiddleware } from './middleware/loggingMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';
import { authenticateRequest } from './middleware/authenticateRequest.js';
import { createServiceProxy } from './proxy/createServiceProxy.js';
import { getChatServiceUrls, getHttpServiceUrls, getWsServiceUrls } from './proxy/targets.js';

const PORT = process.env.PORT ?? 3005;
const webOrigin = process.env.WEB_APP_URL ?? 'http://localhost:3000';
const internalSecret = process.env.GATEWAY_INTERNAL_SECRET?.trim() || undefined;

const httpServiceUrls = getHttpServiceUrls();
const chatServiceUrls = getChatServiceUrls();
const wsServiceUrls = (() => {
  try {
    return getWsServiceUrls();
  } catch {
    return [];
  }
})();

const app = express();

app.use(cors({ origin: webOrigin, credentials: true }));
app.use(requestId);
app.use(loggingMiddleware);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(
  '/api/v1/auth',
  rateLimit({ windowMs: 60_000, max: 120 }),
  createServiceProxy({ urls: httpServiceUrls, internalSecret }),
);

app.use(
  '/api/v1/users',
  rateLimit({ windowMs: 60_000, max: 300 }),
  authenticateRequest,
  createServiceProxy({ urls: httpServiceUrls, internalSecret }),
);

app.use(
  '/api/v1/rooms',
  rateLimit({ windowMs: 60_000, max: 300 }),
  authenticateRequest,
  createServiceProxy({ urls: httpServiceUrls, internalSecret }),
);

app.use(
  '/api/v1/chat',
  rateLimit({ windowMs: 60_000, max: 600 }),
  authenticateRequest,
  createServiceProxy({ urls: chatServiceUrls, internalSecret }),
);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      httpServiceUrls,
      chatServiceUrls,
      wsServiceUrls: wsServiceUrls.length ? wsServiceUrls : undefined,
      webOrigin,
      internalSecret: Boolean(internalSecret),
    },
    'API Gateway started',
  );
});

if (wsServiceUrls.length) {
  const wsProxy = createServiceProxy({ urls: wsServiceUrls, internalSecret, ws: true });
  app.use('/ws', rateLimit({ windowMs: 60_000, max: 300 }), authenticateRequest, wsProxy);
  server.on('upgrade', wsProxy.upgrade);
}
