import type { Request, Response } from 'express';
import type { EditMessageTextInput } from '@repo/validation';
import { prisma } from '@repo/db';
import { toChatMessageRecord } from './@helpers.js';
import { logger } from '../lib/logger.js';

export const editMessageText = async (req: Request, res: Response) => {
  const { id } = req.params as EditMessageTextInput['params'];
  const { text } = req.body as EditMessageTextInput['body'];

  try {
    const updated = await prisma.chatMessage.update({
      where: { id },
      data: {
        text,
        modifiedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: { message: toChatMessageRecord(updated) },
    });
  } catch (error) {
    logger.error({ error, id }, 'Edit message text failed');

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Edit message text failed',
    });
  }
};
