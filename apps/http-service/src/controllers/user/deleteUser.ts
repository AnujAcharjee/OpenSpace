import type { Request, Response } from 'express';
import type { DeleteUserRequest as DeleteUserInput } from '@repo/validation';
import { prisma, Prisma } from '@repo/db';
import { AppError } from '../../utils/appError.js';

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params as DeleteUserInput['params'];

  if (req.user?.id !== id) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: You cannot delete another user's profile",
    });
  }

  try {
    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError('User not found', 404);
    }
    throw error;
  }
};
