import { initEnv } from '@repo/env';

initEnv();

import { logger } from './logger.js';
import { subscriptionManager } from './subscriptionManager.js';
import { startWebSocketServer } from './wss.js';

async function main() {
  try {
    subscriptionManager.initRedisListener();

    await startWebSocketServer();

    logger.info('WebSocket Service started successfully 🎉🎉');
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
  }
}

main();