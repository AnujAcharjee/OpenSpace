import type { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { getRoomMemberIds, toChatMessageRecord } from './@helpers.js';

export const getRoomHistory = async (req: Request, res: Response) => {
  const roomIdParam = req.params.roomId;
  const roomId = Array.isArray(roomIdParam) ? roomIdParam[0]?.trim() : roomIdParam?.trim();
  const userId = req.user?.id;

  if (!roomId) {
    return res.status(400).json({ success: false, error: 'Room id is required' });
  }

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authenticated user is required' });
  }

  logger.debug({ roomId, userId }, 'Chat history requested');

  const memberIds = await getRoomMemberIds(roomId);

  if (!memberIds.includes(userId)) {
    return res.status(403).json({ success: false, error: 'Only room members can view room messages' });
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId,
      isDeleted: false,
    },
    include: {
      user: true,
      parent: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  messages.reverse();

  return res.status(200).json({
    success: true,
    data: {
      roomId,
      messages: messages.map(toChatMessageRecord),
    },
  });
};
