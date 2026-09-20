import type { Request, Response } from 'express';
import type { SearchRoomsRequest } from '@repo/validation';
import { prisma } from '@repo/db';
import { toRoomRecord } from '../@helpers.js';

export const searchRooms = async (req: Request, res: Response) => {
  const queryName = typeof req.query.name === 'string' ? req.query.name.trim() : '';

  const where = queryName
    ? {
        name: {
          contains: queryName,
          mode: 'insensitive' as const,
        },
      }
    : {};

  const rooms = await prisma.chatRoom.findMany({
    where,
    include: {
      creator: true,
      members: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 50,
  });

  return res.status(200).json({
    success: true,
    data: { rooms: rooms.map(toRoomRecord) },
  });
};
