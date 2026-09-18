import type { Request, Response } from 'express';
import type { GetUserRequest } from '@repo/validation';
import { prisma } from '@repo/db';
import { toUserRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const getUser = async (req: Request, res: Response) => {
  const validatedRequest = {
    params: req.params,
    query: req.query,
  } as GetUserRequest;

  const id = validatedRequest.params.id ?? validatedRequest.query.id;
  const email = validatedRequest.query.email?.toLowerCase();
  const username = validatedRequest.query.username;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(id ? [{ id }] : []),
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : []),
      ],
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return res.status(200).json({
    success: true,
    data: { user: toUserRecord(user) },
  });
};
