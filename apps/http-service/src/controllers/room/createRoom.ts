import type { Request, Response } from 'express';
import type { CreateRoomInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, Prisma } from '@repo/db';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';

export const createRoom = async (req: Request, res: Response) => {
  const data = req.body as CreateRoomInput;
  const creatorId = req.user?.id;

  if (!creatorId) {
    return res.status(401).json({
      success: false,
      error: 'Authenticated user is required',
    });
  }

  const existingRoom = await prisma.chatRoom.findFirst({
    where: {
      name: {
        equals: data.name.trim(),
        mode: 'insensitive',
      },
    },
  });

  if (existingRoom) {
    return res.status(409).json({
      success: false,
      error: 'A room with this name already exists',
    });
  }

  const roomId = crypto.randomUUID();

  try {
    const room = await prisma.chatRoom.create({
      data: {
        id: roomId,
        name: data.name.trim(),
        description: data.description ?? null,
        avatarUrl: data.avatarUrl ?? null,
        topics: data.topics ?? [],
        isPrivate: data.isPrivate,
        creatorId,
        updatedAt: new Date(),
        members: {
          create: {
            id: crypto.randomUUID(),
            userId: creatorId,
            role: 'OWNER',
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
    } catch (err) {
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
