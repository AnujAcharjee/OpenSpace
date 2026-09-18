import type { Request, Response } from 'express';
import type { GetRoomRequest } from '@repo/validation';
import { prisma } from '@repo/db';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const getRoom = async (req: Request, res: Response) => {
  const { id } = req.params as GetRoomRequest['params'];

  const room = await prisma.chatRoom.findUnique({
    where: { id },
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

  return res.status(200).json({
    success: true,
    data: { room: toRoomRecord(room) },
  });
};
