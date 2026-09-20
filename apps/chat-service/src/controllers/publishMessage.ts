import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { isUserInRoom } from './@helpers.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';

const CHAT_STREAM = 'stream:chat-messages';

type PublishMessageBody = {
  sender: string;
  text?: string;
  attachments?: string;
  roomId: string;
  parentId?: string;
};

type PublishMessagePayload = PublishMessageBody & {
  id: string;
  createdAt: string;
};

export const publishMessage = async (req: Request, res: Response) => {
  const message = req.body as PublishMessageBody;

  const chatMessagePayload: PublishMessagePayload = {
    ...message,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };

  try {
    const isRoomMember = await isUserInRoom(chatMessagePayload.roomId, chatMessagePayload.sender);

    if (!isRoomMember) {
      return res.status(403).json({
        success: false,
        error: 'You are no longer a member of this room',
      });
    }

    const roomChannel = `room:${chatMessagePayload.roomId}`;

    const pipeline = redis
      .pipeline()
      .xadd(CHAT_STREAM, 'MAXLEN', '~', 100000, '*', 'data', JSON.stringify(chatMessagePayload))
      .publish(
        roomChannel,
        JSON.stringify({
          type: 'chat_message',
          payload: chatMessagePayload,
        }),
      );

    const pipelineResults = await pipeline.exec();

    if (!pipelineResults) {
      throw new Error('Redis pipeline returned no results');
    }

    const pipelineError = pipelineResults.find(([error]) => error);

    if (pipelineError) {
      throw pipelineError[0];
    }

    logger.info({ message }, `Message published to Redis room channel ${roomChannel}`);

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: { message, status: 'sent' },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to publish message to Redis');

    return res.status(500).json({ success: false, error: 'Failed to publish message' });
  }
};
