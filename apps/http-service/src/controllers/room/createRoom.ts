import type { Request, Response } from 'express';
import type { CreateRoomInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma } from '@repo/db';
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

  const roomId = crypto.randomUUID();
  const room = await prisma.chatRoom.create({
    data: {
      id: roomId,
      name: data.name,
      description: data.description ?? null,
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

  return res.status(201).json({
    success: true,
    message: 'Room created successfully',
    data: { room: toRoomRecord(room) },
  });
};
