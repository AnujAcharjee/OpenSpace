import type { Request, Response } from 'express';
import type { SearchRoomsRequest } from '@repo/validation';
import { prisma } from '@repo/db';
import { toRoomRecord } from '../@helpers.js';

export const searchRooms = async (req: Request, res: Response) => {
  const { name } = req.query as SearchRoomsRequest['query'];

  const rooms = await prisma.chatRoom.findMany({
    where: {
      name: {
        contains: name,
        mode: 'insensitive',
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
    take: 50,
  });

  return res.status(200).json({
    success: true,
    data: { rooms: rooms.map(toRoomRecord) },
  });
};
