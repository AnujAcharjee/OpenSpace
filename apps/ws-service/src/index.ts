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