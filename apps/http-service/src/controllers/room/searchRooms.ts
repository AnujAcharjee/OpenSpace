import type { Request, Response } from 'express';
import type { SearchRoomsRequest } from '@repo/validation';
import { prisma } from '@repo/db';
import { toRoomRecord } from '../@helpers.js';

export const searchRooms = async (req: Request, res: Response) => {
  const queryName = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  const queryTopic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (queryName) {
    where.name = {
      contains: queryName,
      mode: 'insensitive' as const,
    };
  }
  if (queryTopic && queryTopic.toLowerCase() !== 'all') {
    where.topics = {
      has: queryTopic,
    };
  }

  const [rooms, total] = await Promise.all([
    prisma.chatRoom.findMany({
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
      skip,
      take: limit,
    }),
    prisma.chatRoom.count({ where }),
  ]);

  const hasMore = skip + rooms.length < total;

  return res.status(200).json({
    success: true,
    data: {
      rooms: rooms.map(toRoomRecord),
      hasMore,
      page,
      total,
    },
  });
};
