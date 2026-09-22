import type { Request, Response } from 'express';
import type { LeaveRoomRequest as LeaveRoomInput } from '@repo/validation';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const leaveRoom = async (req: Request, res: Response) => {
  const { id: roomId } = req.params as LeaveRoomInput['params'];
  const userId = req.user?.id ?? (req.body as LeaveRoomInput['body'])?.userId;

  if (!userId) {
    throw new AppError('Authenticated user is required', 401);
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

  const existingMember = room.members.find((member) => member.userId === userId);

  if (!existingMember) {
    throw new AppError('You are not a member of this room', 400);
  }

  // Delete the membership
  await prisma.chatRoomMember.delete({
    where: { id: existingMember.id },
  });

  const updatedRoom = await prisma.chatRoom.findUnique({
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

  const username = existingMember.user?.username ?? 'A user';

  try {
    // 1. Notify remaining room members via room channel
    await redis.publish(
      `room:${roomId}`,
      JSON.stringify({
        type: 'chat_message',
        payload: {
          id: uuidv4(),
          sender: 'SYSTEM',
          senderUsername: 'SYSTEM',
          text: `${username} left the room`,
          roomId,
          createdAt: new Date().toISOString(),
        },
      }),
    );

    // 2. Notify the leaving user via user channel
    const removalPayload = {
      type: 'room_member_removed',
      payload: {
        roomId,
        removedUserId: userId,
        removedUsername: username,
      },
    };

    await redis.publish(`user:${userId}`, JSON.stringify(removalPayload));
    await redis.publish(`room:${roomId}`, JSON.stringify(removalPayload));

    // 3. Evict from Redis membership cache
    await redis.srem(`room:${roomId}:members`, userId);
  } catch (publishError) {
    logger.error({ publishError, roomId, userId }, 'Leave room WS publish failed');
  }

  return res.status(200).json({
    success: true,
    message: 'Successfully left the room',
    data: {
      room: updatedRoom ? toRoomRecord(updatedRoom) : null,
      roomId,
      userId,
    },
  });
};
