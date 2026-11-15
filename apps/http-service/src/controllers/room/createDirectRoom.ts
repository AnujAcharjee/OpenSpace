import type { Request, Response } from 'express';
import type { CreateDirectRoomInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, RoomMemberRole } from '@repo/db';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const createDirectRoom = async (req: Request, res: Response) => {
  const { targetUserId } = req.body as CreateDirectRoomInput;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    throw new AppError('Authenticated user is required', 401);
  }

  if (targetUserId === currentUserId) {
    throw new AppError('Cannot start a direct conversation with yourself', 400);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError('Target user not found', 404);
  }

  // Check if a direct room already exists between these two users
  const existingDirectRoom = await prisma.chatRoom.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { members: { some: { userId: currentUserId } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: {
      creator: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (existingDirectRoom) {
    try {
      await redis.sadd(`room:${existingDirectRoom.id}:members`, currentUserId, targetUserId);
      await redis.expire(`room:${existingDirectRoom.id}:members`, 86400);
    } catch {
      // Non-blocking cache
    }

    return res.status(200).json({
      success: true,
      message: 'Direct conversation found',
      data: { room: toRoomRecord(existingDirectRoom) },
    });
  }

  const roomId = crypto.randomUUID();

  const newRoom = await prisma.chatRoom.create({
    data: {
      id: roomId,
      type: 'DIRECT',
      name: null,
      description: null,
      avatarUrl: null,
      creatorId: null,
      updatedAt: new Date(),
      members: {
        create: [
          {
            id: crypto.randomUUID(),
            userId: currentUserId,
            role: RoomMemberRole.MEMBER,
          },
          {
            id: crypto.randomUUID(),
            userId: targetUserId,
            role: RoomMemberRole.MEMBER,
          },
        ],
      },
    },
    include: {
      creator: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  const roomRecord = toRoomRecord(newRoom);

  try {
    await redis.sadd(`room:${newRoom.id}:members`, currentUserId, targetUserId);
    await redis.expire(`room:${newRoom.id}:members`, 86400);

    const joinPayload = JSON.stringify({
      type: 'room_joined',
      payload: { room: roomRecord },
    });

    await redis.publish(`user:${currentUserId}`, joinPayload);
    await redis.publish(`user:${targetUserId}`, joinPayload);
  } catch {
    // Non-blocking cache & live event dispatch
  }

  return res.status(201).json({
    success: true,
    message: 'Direct conversation created successfully',
    data: { room: roomRecord },
  });
};
