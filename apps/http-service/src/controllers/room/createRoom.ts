import type { Request, Response } from 'express';
import type { CreateRoomInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, Prisma, RoomMemberRole } from '@repo/db';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';
import { createDirectRoom } from './createDirectRoom.js';
import { createGroupRoom } from './createGroupRoom.js';

export const createRoom = async (req: Request, res: Response) => {
  const data = req.body as CreateRoomInput;
  const creatorId = req.user?.id;

  if (!creatorId) {
    return res.status(401).json({
      success: false,
      error: 'Authenticated user is required',
    });
  }

  // If direct conversation is requested
  if (data.type === 'DIRECT' && data.targetUserId) {
    return createDirectRoom(req, res);
  }

  // If group name is supplied, create a group conversation
  if (data.name) {
    return createGroupRoom(req, res);
  }

  const roomId = crypto.randomUUID();

  try {
    const room = await prisma.chatRoom.create({
      data: {
        id: roomId,
        type: 'GROUP',
        name: data.name?.trim() || 'Untitled Chat',
        description: data.description ?? null,
        avatarUrl: data.avatarUrl ?? null,
        creatorId,
        updatedAt: new Date(),
        members: {
          create: {
            id: crypto.randomUUID(),
            userId: creatorId,
            role: RoomMemberRole.OWNER,
          },
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

    const roomRecord = toRoomRecord(room);

    try {
      await redis.sadd(`room:${roomId}:members`, creatorId);
      await redis.expire(`room:${roomId}:members`, 86400);
    } catch {
      // Non-blocking cache
    }

    return res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room: roomRecord },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A room with this name already exists',
      });
    }
    throw error;
  }
};
