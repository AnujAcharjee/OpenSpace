import type { Request, Response } from 'express';
import type { CreateUserInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, Prisma } from '@repo/db';
import { toUserRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

import { enrollUserInDefaultRooms } from '../../lib/defaultRooms.js';

export const createUser = async (req: Request, res: Response) => {
  const data = req.body as CreateUserInput;

  try {
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: data.email.toLowerCase(),
        username: data.username,
        name: data.name ?? null,
        bio: data.bio ?? null,
        avatarUrl: data.avatarUrl ?? null,
        updatedAt: new Date(),
      },
    });

    await enrollUserInDefaultRooms(user.id);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: toUserRecord(user) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('User with this email or username already exists', 409);
    }
    throw error;
  }
};
