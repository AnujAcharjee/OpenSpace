import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { createRedisClient, type RedisClient, type RedisEventHandlers } from '@repo/redis';
import { logger } from './logger.js';
import { WebSocketServer } from 'ws';
import {
  chatMessagePayloadAndReceiversSchema,
  roomMemberRemovedPayloadAndReceiversSchema,
  type ChatMessagePayloadAndReceivers,
  type RoomMemberRemovedPayloadAndReceivers,
  type WsMessage,
} from '@repo/validation';
import { AppWebSocket } from './types/wss.js';

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

export const initConsumer = async (channel: string, wss: WebSocketServer): Promise<void> => {
  /**
   * ON MESSAGE
   * - consume msg
   * - parse msg
   * - get all clients for the active receivers
   * - send ws message to all
   */
  redisSub.on('message', (chan: string, message: string) => {
    if (chan !== channel) return;

    logger.debug({ channel, message }, 'Received message from Redis');

    let parsedChatMessage: ChatMessagePayloadAndReceivers | null = null;
    let parsedRoomMemberRemoved: RoomMemberRemovedPayloadAndReceivers | null = null;
    try {
      const raw = JSON.parse(message);

      try {
        parsedChatMessage = chatMessagePayloadAndReceiversSchema.parse(raw);
      } catch {
        parsedRoomMemberRemoved = roomMemberRemovedPayloadAndReceiversSchema.parse(raw);
      }
    } catch (err) {
      logger.error({ err, message }, 'Failed to parse Redis message');
      return;
    }

    if (parsedChatMessage) {
      const { sender, text, attachments, roomId, parentId, createdAt, id, receivers } = parsedChatMessage;

      const receiverIds = new Set(receivers);
      const clients = [...wss.clients].filter(
        (client): client is AppWebSocket => receiverIds.has((client as AppWebSocket).user.id),
      );

      logger.debug({ clients: clients.length }, 'Number of clients to receive the message');

      const wsMessage: WsMessage = {
        type: 'chat_message',
        payload: { id, parentId, sender, text, attachments, roomId, createdAt },
      };
      const wsStrMessage = JSON.stringify(wsMessage);

      clients.forEach((client: AppWebSocket) => {
        if (client.readyState === client.OPEN) {
          client.send(wsStrMessage);
        }
      });

      return;
    }

    if (parsedRoomMemberRemoved) {
      const { roomId, removedUserId, removedUsername, receivers } = parsedRoomMemberRemoved;
      const receiverIds = new Set(receivers);
      const clients = [...wss.clients].filter(
        (client): client is AppWebSocket => receiverIds.has((client as AppWebSocket).user.id),
      );

      const wsMessage: WsMessage = {
        type: 'room_member_removed',
        payload: { roomId, removedUserId, removedUsername },
      };
      const wsStrMessage = JSON.stringify(wsMessage);

      clients.forEach((client: AppWebSocket) => {
        if (client.readyState === client.OPEN) {
          client.send(wsStrMessage);
        }
      });
    }
  });

  // Subscribe to the Redis channel
  await redisSub.subscribe(channel);
  logger.info({ channel }, 'Subscribed to Redis channel');
};
