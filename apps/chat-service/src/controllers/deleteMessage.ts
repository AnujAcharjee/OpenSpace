import type { Request, Response } from 'express';
import type { DeleteMessageInput } from '@repo/validation';
import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';

export const deleteMessage = async (req: Request, res: Response) => {
  const { id } = req.params as DeleteMessageInput['params'];

  try {
    await prisma.chatMessage.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
      data: { id, success: true },
    });
  } catch (error) {
    logger.error({ error, id }, 'Delete message failed');

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete message failed',
    });
  }
};
