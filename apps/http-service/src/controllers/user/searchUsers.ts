import type { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { toUserRecord } from '../@helpers.js';

export const searchUsers = async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().replace(/^@+/, '') : '';

  if (!query) {
    return res.status(200).json({
      success: true,
      data: { users: [] },
    });
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 10,
    orderBy: {
      username: 'asc',
    },
  });

  return res.status(200).json({
    success: true,
    data: { users: users.map(toUserRecord) },
  });
};
