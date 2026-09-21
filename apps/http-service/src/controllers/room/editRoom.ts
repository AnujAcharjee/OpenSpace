import type { Request, Response } from 'express';
import type { EditRoomRequest as EditRoomInput } from '@repo/validation';
import { prisma, Prisma } from '@repo/db';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const editRoom = async (req: Request, res: Response) => {
  const data = req.body as EditRoomInput['body'];
  const { id } = req.params as EditRoomInput['params'];

  if (data.name !== undefined) {
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: data.name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingRoom) {
      throw new AppError('A room with this name already exists', 409);
    }
  }

  try {
    const updatedRoom = await prisma.chatRoom.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: { room: toRoomRecord(updatedRoom) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new AppError('Room not found', 404);
      }
      if (error.code === 'P2002') {
        throw new AppError('A room with this name already exists', 409);
      }
    }
    throw error;
  }
};
