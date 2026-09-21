import type { Request, Response } from 'express';
import type { DeleteMessageInput } from '@repo/validation';
import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';

export const deleteMessage = async (req: Request, res: Response) => {
  const { id } = req.params as DeleteMessageInput['params'];
  const userId = req.user?.id;

  try {
    const existing = await prisma.chatMessage.findUnique({
      where: { id },
      select: {
        id: true,
        roomId: true,
        userId: true,
        isDeleted: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    if (userId && existing.userId !== userId) {
      const member = await prisma.chatRoomMember.findFirst({
        where: {
          roomId: existing.roomId,
          userId,
        },
      });

      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this message',
        });
      }
    }

    const updated = await prisma.chatMessage.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        roomId: true,
      },
    });

    try {
      const roomChannel = `room:${updated.roomId}`;
      await redis.publish(
        roomChannel,
        JSON.stringify({
          type: 'message_deleted',
          payload: {
            messageId: updated.id,
            roomId: updated.roomId,
          },
        }),
      );
    } catch (publishError) {
      logger.error({ publishError, messageId: updated.id }, 'Message deleted but live publish failed');
    }

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
      data: { id: updated.id, roomId: updated.roomId, success: true },
    });
  } catch (error) {
    logger.error({ error, id }, 'Delete message failed');

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete message failed',
    });
  }
};
