import { WebSocket } from 'ws';
import { prisma } from '@repo/db';
import {
  chatMessagePayloadSchema,
  messageDeletedPayloadSchema,
  roomMemberRemovedPayloadSchema,
  notificationPayloadSchema,
  roomJoinedPayloadSchema,
  roomUpdatedPayloadSchema,
  roomDeletedPayloadSchema,
  roomJoinRequestedPayloadSchema,
  type WsMessage,
} from '@repo/validation';
import { redisSub } from './redis.js';
import { logger } from './logger.js';
import type { AppWebSocket } from './types/wss.js';

export class SubscriptionManager {
  private roomSockets = new Map<string, Set<AppWebSocket>>();
  private userSockets = new Map<string, Set<AppWebSocket>>();
  private socketRooms = new WeakMap<AppWebSocket, Set<string>>();
  private isListening = false;

  public initRedisListener(): void {
    if (this.isListening) return;

    redisSub.on('message', (channel: string, message: string) => {
      try {
        if (channel.startsWith('room:')) {
          const roomId = channel.slice('room:'.length);
          this.handleRoomMessage(roomId, message);
          return;
        }

        if (channel.startsWith('user:')) {
          const userId = channel.slice('user:'.length);
          this.handleUserMessage(userId, message);
          return;
        }

        // Backward compatibility fallback for legacy global channel
        if (channel === 'chat-messages') {
          this.handleLegacyGlobalMessage(message);
        }
      } catch (err) {
        logger.error({ err, channel, message }, 'Error handling Redis message');
      }
    });

    this.isListening = true;
    logger.info('SubscriptionManager Redis listener initialized');
  }

  private handleRoomMessage(roomId: string, rawMessage: string): void {
    const sockets = this.roomSockets.get(roomId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    try {
      const raw = JSON.parse(rawMessage);
      let wsMessage: WsMessage | null = null;

      if (raw.type === 'chat_message' || (!raw.type && (raw.sender || raw.text))) {
        const payload = chatMessagePayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'chat_message',
            payload: payload.data,
          };
        }
      } else if (raw.type === 'message_deleted') {
        const payload = messageDeletedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'message_deleted',
            payload: payload.data,
          };
        }
      } else if (raw.type === 'room_member_removed' || (!raw.type && raw.removedUserId)) {
        const payload = roomMemberRemovedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'room_member_removed',
            payload: payload.data,
          };
        }
      } else if (raw.type === 'room_updated') {
        const payload = roomUpdatedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'room_updated',
            payload: payload.data,
          };
        }
      } else if (raw.type === 'room_deleted') {
        const payload = roomDeletedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'room_deleted',
            payload: payload.data,
          };
        }
      } else if (raw.type === 'room_join_requested') {
        const payload = roomJoinRequestedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'room_join_requested',
            payload: payload.data,
          };
        }
      }

      if (!wsMessage) {
        logger.warn({ rawMessage, roomId }, 'Unrecognized room message schema');
        return;
      }

      const wsStrMessage = JSON.stringify(wsMessage);

      for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(wsStrMessage);
        }
      }

      logger.debug(
        { roomId, clientCount: sockets.size, type: wsMessage.type },
        'Dispatched room message to local subscribers',
      );
    } catch (err) {
      logger.error({ err, roomId, rawMessage }, 'Failed to parse room message');
    }
  }

  private handleUserMessage(userId: string, rawMessage: string): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    try {
      const raw = JSON.parse(rawMessage);
      let wsMessage: WsMessage | null = null;

      if (raw.type === 'room_member_removed' || (!raw.type && raw.removedUserId)) {
        const payload = roomMemberRemovedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'room_member_removed',
            payload: payload.data,
          };
        }
      } else if (raw.type === 'notification') {
        const payload = notificationPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'notification',
            payload: payload.data,
          };
        }
      } else if (raw.type === 'room_joined') {
        const payload = roomJoinedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'room_joined',
            payload: payload.data,
          };
          // Auto-join this socket to the room channel
          for (const client of sockets) {
            void this.joinRoom(client, payload.data.room.id);
          }
        }
      } else if (raw.type === 'room_deleted') {
        const payload = roomDeletedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'room_deleted',
            payload: payload.data,
          };
        }
      } else if (raw.type === 'room_join_requested') {
        const payload = roomJoinRequestedPayloadSchema.safeParse(raw.payload ?? raw);
        if (payload.success) {
          wsMessage = {
            type: 'room_join_requested',
            payload: payload.data,
          };
        }
      }

      if (!wsMessage) {
        logger.warn({ rawMessage, userId }, 'Unrecognized user message schema');
        return;
      }

      const wsStrMessage = JSON.stringify(wsMessage);

      for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(wsStrMessage);
        }
      }

      logger.debug(
        { userId, clientCount: sockets.size, type: wsMessage.type },
        'Dispatched user message to local subscribers',
      );
    } catch (err) {
      logger.error({ err, userId, rawMessage }, 'Failed to parse user message');
    }
  }

  private handleLegacyGlobalMessage(rawMessage: string): void {
    try {
      const raw = JSON.parse(rawMessage);
      const roomId = raw.roomId;
      if (roomId) {
        this.handleRoomMessage(roomId, rawMessage);
      }
    } catch (err) {
      logger.error({ err, rawMessage }, 'Failed to parse legacy global message');
    }
  }

  public async registerClient(ws: AppWebSocket): Promise<void> {
    const userId = ws.user?.id;
    if (!userId) return;

    // 1. Register User-scoped socket mapping
    let userSet = this.userSockets.get(userId);
    if (!userSet) {
      userSet = new Set();
      this.userSockets.set(userId, userSet);
      await redisSub.subscribe(`user:${userId}`);
      logger.debug({ userId }, 'Subscribed to Redis user channel');
    }
    userSet.add(ws);

    // 2. Fetch User Room Memberships and register Room-scoped mappings
    try {
      const memberships = await prisma.chatRoomMember.findMany({
        where: { userId },
        select: { roomId: true },
      });

      for (const { roomId } of memberships) {
        await this.joinRoom(ws, roomId);
      }

      logger.info(
        { userId, username: ws.user.username, roomCount: memberships.length },
        'Registered client and subscribed to member rooms',
      );
    } catch (dbError) {
      logger.error({ dbError, userId }, 'Failed to load initial room memberships for client');
    }
  }

  public async joinRoom(ws: AppWebSocket, roomId: string): Promise<void> {
    let roomSet = this.roomSockets.get(roomId);
    if (!roomSet) {
      roomSet = new Set();
      this.roomSockets.set(roomId, roomSet);
      await redisSub.subscribe(`room:${roomId}`);
      logger.debug({ roomId }, 'Subscribed to Redis room channel');
    }
    roomSet.add(ws);

    let clientRooms = this.socketRooms.get(ws);
    if (!clientRooms) {
      clientRooms = new Set();
      this.socketRooms.set(ws, clientRooms);
    }
    clientRooms.add(roomId);
  }

  public async leaveRoom(ws: AppWebSocket, roomId: string): Promise<void> {
    const roomSet = this.roomSockets.get(roomId);
    if (roomSet) {
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        this.roomSockets.delete(roomId);
        await redisSub.unsubscribe(`room:${roomId}`);
        logger.debug({ roomId }, 'Unsubscribed from Redis room channel');
      }
    }

    const clientRooms = this.socketRooms.get(ws);
    if (clientRooms) {
      clientRooms.delete(roomId);
    }
  }

  public async unregisterClient(ws: AppWebSocket): Promise<void> {
    const userId = ws.user?.id;

    // 1. Remove from all joined rooms
    const clientRooms = this.socketRooms.get(ws);
    if (clientRooms) {
      for (const roomId of clientRooms) {
        await this.leaveRoom(ws, roomId);
      }
    }

    // 2. Remove from User sockets
    if (userId) {
      const userSet = this.userSockets.get(userId);
      if (userSet) {
        userSet.delete(ws);
        if (userSet.size === 0) {
          this.userSockets.delete(userId);
          await redisSub.unsubscribe(`user:${userId}`);
          logger.debug({ userId }, 'Unsubscribed from Redis user channel');
        }
      }
    }

    logger.info({ userId, username: ws.user?.username }, 'Unregistered client from subscriptions');
  }
}

export const subscriptionManager = new SubscriptionManager();
