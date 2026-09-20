import type { Request, Response } from 'express';
import type { CreateMessageInput } from '@repo/validation';
import { v4 as uuidv4 } from 'uuid';
import { prisma, MessageType } from '@repo/db';
import { isUserInRoom, toChatMessageRecord } from './@helpers.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';

export const createMessage = async (req: Request, res: Response) => {
  const { text, attachments, roomId, parentId, type } = req.body as CreateMessageInput['body'];
  const sender = req.user?.id;

  if (!sender) {
    return res.status(401).json({
      success: false,
      error: 'Authenticated user is required',
    });
  }

  try {
    const isRoomMember = await isUserInRoom(roomId, sender);

    if (!isRoomMember) {
      return res.status(403).json({
        success: false,
        error: 'You are no longer a member of this room',
      });
    }

    const messageId = uuidv4();
    const created = await prisma.chatMessage.create({
      data: {
        id: messageId,
        userId: sender,
        roomId,
        text: text ?? '',
        attachments: attachments ? JSON.parse(attachments) : null,
        parentId: parentId ?? null,
        type: (type as keyof typeof MessageType) ?? MessageType.TEXT,
        updatedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    const messageRecord = toChatMessageRecord(created);

    try {
      const roomChannel = `room:${messageRecord.roomId}`;
      await redis.publish(
        roomChannel,
        JSON.stringify({
          type: 'chat_message',
          payload: {
            id: messageRecord.id,
            sender: messageRecord.userId,
            text: messageRecord.text,
            attachments: messageRecord.attachments,
            roomId: messageRecord.roomId,
            parentId: messageRecord.parentId,
            createdAt: messageRecord.createdAt,
          },
        }),
      );
    } catch (publishError) {
      logger.error({ publishError, messageId: messageRecord.id }, 'Message created but live publish failed');
    }

    return res.status(201).json({
      success: true,
      message: 'Message created successfully',
      data: { message: messageRecord },
    });
  } catch (error) {
    logger.error({ error }, 'Create message failed');

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Create message failed',
    });
  }
};
