import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { createRedisClient, type RedisClient, type RedisEventHandlers } from '@repo/redis';
import { logger } from './logger.js';

const url = process.env.REDIS_URL || 'redis://localhost:6379';

// const config: RedisConfig = {
//   host: process.env.REDIS_HOST || 'localhost',
//   port: Number(process.env.REDIS_PORT) || 6379,
//   username: process.env.REDIS_USERNAME,
//   password: process.env.REDIS_PASSWORD,
//   db: Number(process.env.REDIS_DB) || 0,
//   tls: process.env.REDIS_TLS === 'true',
// };

const eventHandlers: RedisEventHandlers = {
  onConnect: () => {
    logger.info('Connected to Redis');
  },
  onReady: () => {
    logger.info('Redis client is ready');
  },
  onClose: () => {
    logger.warn('Redis connection closed');
  },
  onError: (error) => {
    logger.error({ error }, 'Redis error');
  },
};

export const redis: RedisClient = createRedisClient(url, eventHandlers);
export const redisSub: RedisClient = createRedisClient(url, eventHandlers);

