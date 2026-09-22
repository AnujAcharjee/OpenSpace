import crypto from 'crypto';
import { prisma } from '@repo/db';
import { redis } from './redis.js';
import { logger } from './logger.js';

export const DEFAULT_ROOM_IDS = [
  'e2fcacf2-8ac3-4a15-ab18-8eb6415266ad', // World Chat
  'c2d30a25-ccba-4686-8843-c9178da7a5a3', // Football
  'db96fd04-edc8-4a0f-a955-9754a2a071cf', // AI Chat
] as const;

export async function enrollUserInDefaultRooms(userId: string): Promise<void> {
  for (const roomId of DEFAULT_ROOM_IDS) {
    try {
      await prisma.chatRoomMember.upsert({
        where: {
          roomId_userId: { roomId, userId },
        },
        update: {},
        create: {
          id: crypto.randomUUID(),
          roomId,
          userId,
          role: 'MEMBER',
        },
      });

      // Update Redis membership cache
      await redis.sadd(`room:${roomId}:members`, userId);
    } catch (roomError) {
      logger.warn({ roomError, roomId, userId }, 'Could not add user to default room');
    }
  }
}
