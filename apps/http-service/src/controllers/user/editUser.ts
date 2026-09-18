import type { Request, Response } from 'express';
import type { EditUserRequest as EditUserInput } from '@repo/validation';
import { prisma, Prisma } from '@repo/db';
import { toUserRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const editUser = async (req: Request, res: Response) => {
  const data = req.body as EditUserInput['body'];
  const { id } = req.params as EditUserInput['params'];

  if (req.user?.id !== id) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: You cannot modify another user's profile",
    });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email.toLowerCase() }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: toUserRecord(updatedUser) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new AppError('User not found', 404);
      }
      if (error.code === 'P2002') {
        throw new AppError('User with this email or username already exists', 409);
      }
    }
    throw error;
  }
};
