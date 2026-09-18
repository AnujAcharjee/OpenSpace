import type { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { toRoomRecord, toUserRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const hydrateUser = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          chatRoom: {
            include: {
              creator: true,
              members: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const rooms = user.memberships
    .map((membership) => membership.chatRoom)
    .filter((room): room is NonNullable<typeof room> => Boolean(room))
    .map(toRoomRecord);

  return res.status(200).json({
    success: true,
    data: {
      user: toUserRecord(user),
      rooms,
    },
  });
};
