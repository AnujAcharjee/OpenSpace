import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { logger } from './logger.js';
import { initConsumer } from './redis.js';
import { startWebSocketServer } from './wss.js';

const redisChannel = 'chat-messages';

async function main() {
  try {
    const wss = await startWebSocketServer();

    await initConsumer(redisChannel, wss);
  
    logger.info('Server started successfully 🎉🎉');
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
  }
}

main()