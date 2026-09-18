import type { Request, Response } from 'express';
import type { GetRoomMessagesInput } from '@repo/validation';
import { prisma } from '@repo/db';
import { getRoomMemberIds, toChatMessageRecord } from './@helpers.js';
import { logger } from '../lib/logger.js';

export const getRoomMessages = async (req: Request, res: Response) => {
  const { roomId } = req.params as GetRoomMessagesInput['params'];
  const { limit } = req.query as GetRoomMessagesInput['query'];
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authenticated user is required',
    });
  }

  logger.debug({ roomId, userId, limit }, 'Chat messages requested');

  try {
    const memberIds = await getRoomMemberIds(roomId);

    if (!memberIds.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only room members can view room messages',
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit ? Number(limit) : 100,
    });

    return res.status(200).json({
      success: true,
      data: {
        roomId,
        messages: messages.map(toChatMessageRecord),
      },
    });
  } catch (error) {
    logger.error({ error, roomId, userId, limit }, 'Get room messages failed');

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Get room messages failed',
    });
  }
};
