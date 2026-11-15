import crypto from 'crypto';
import { prisma } from '@repo/db';
import { redis } from './redis.js';
import { logger } from './logger.js';

export const WELCOME_GROUP_ID = 'e2fcacf2-8ac3-4a15-ab18-8eb6415266ad';

export async function enrollUserInDefaultRooms(userId: string): Promise<void> {
  try {
    // Check if the welcome group exists, or create it if absent
    let welcomeGroup = await prisma.chatRoom.findUnique({
      where: { id: WELCOME_GROUP_ID },
    });

    if (!welcomeGroup) {
      welcomeGroup = await prisma.chatRoom.create({
        data: {
          id: WELCOME_GROUP_ID,
          type: 'GROUP',
          name: 'Welcome Group',
          description: 'Official community group for new members to say hi!',
          avatarUrl: null,
          updatedAt: new Date(),
        },
      });
    }

    await prisma.chatRoomMember.upsert({
      where: {
        roomId_userId: { roomId: WELCOME_GROUP_ID, userId },
      },
      update: {},
      create: {
        id: crypto.randomUUID(),
        roomId: WELCOME_GROUP_ID,
        userId,
        role: 'MEMBER',
      },
    });

    // Update Redis membership cache
    await redis.sadd(`room:${WELCOME_GROUP_ID}:members`, userId);
    await redis.expire(`room:${WELCOME_GROUP_ID}:members`, 86400);
  } catch (roomError) {
    logger.warn({ roomError, userId }, 'Could not add user to welcome room');
  }
}
