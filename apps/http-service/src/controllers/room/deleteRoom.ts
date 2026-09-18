import type { Request, Response } from 'express';
import type { DeleteRoomRequest as DeleteRoomInput } from '@repo/validation';
import { prisma, Prisma } from '@repo/db';
import { AppError } from '../../utils/appError.js';

export const deleteRoom = async (req: Request, res: Response) => {
  const { id } = req.params as DeleteRoomInput['params'];

  try {
    await prisma.chatRoom.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Room deleted successfully',
      data: { id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError('Room not found', 404);
    }
    throw error;
  }
};
