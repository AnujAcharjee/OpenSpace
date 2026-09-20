import type { Request, Response } from 'express';
import type { RemoveRoomMemberRequest as RemoveRoomMemberInput } from '@repo/validation';
import { v4 as uuidv4 } from 'uuid';
import { prisma, Prisma } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const removeRoomMember = async (req: Request, res: Response) => {
  const { id: roomId, memberId } = req.params as RemoveRoomMemberInput['params'];

  const roomBeforeRemoval = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      creator: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!roomBeforeRemoval) {
    throw new AppError('Room not found', 404);
  }

  const removedMember = roomBeforeRemoval.members.find((member) => member.id === memberId);

  try {
    await prisma.chatRoomMember.delete({
      where: { id: memberId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError('Room member not found', 404);
    }
    throw error;
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      creator: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  if (removedMember) {
    const removedUsername = removedMember.user?.username ?? 'A user';

    try {
      // 1. Notify remaining room members via room-scoped channel
      await redis.publish(
        `room:${roomId}`,
        JSON.stringify({
          type: 'chat_message',
          payload: {
            id: uuidv4(),
            sender: removedMember.userId,
            text: `${removedUsername} was removed from the room`,
            roomId,
            createdAt: new Date().toISOString(),
          },
        }),
      );

      // 2. Notify the removed user specifically via their user-scoped channel
      const removalPayload = {
        type: 'room_member_removed',
        payload: {
          roomId,
          removedUserId: removedMember.userId,
          removedUsername,
        },
      };

      await redis.publish(`user:${removedMember.userId}`, JSON.stringify(removalPayload));
      await redis.publish(`room:${roomId}`, JSON.stringify(removalPayload));
    } catch (publishError) {
      logger.error({ publishError, roomId, memberId }, 'Room member removed but WS publish failed');
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    data: {
      room: toRoomRecord(room),
      id: memberId,
    },
  });
};
