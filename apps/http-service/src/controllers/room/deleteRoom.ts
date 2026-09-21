import type { Request, Response } from 'express';
import type { DeleteRoomRequest as DeleteRoomInput } from '@repo/validation';
import { prisma, Prisma } from '@repo/db';
import { redis } from '../../lib/redis.js';
import { AppError } from '../../utils/appError.js';

export const deleteRoom = async (req: Request, res: Response) => {
  const { id } = req.params as DeleteRoomInput['params'];

  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    const memberUserIds = room.members.map((m) => m.userId);

    await prisma.chatRoom.delete({
      where: { id },
    });

    try {
      await redis.del(`room:${id}:members`);

      const deletePayload = JSON.stringify({
        type: 'room_deleted',
        payload: {
          roomId: id,
          roomName: room.name,
        },
      });

      // Notify all room members directly via user channel and room channel
      for (const memberId of memberUserIds) {
        await redis.publish(`user:${memberId}`, deletePayload);
      }
      await redis.publish(`room:${id}`, deletePayload);
    } catch {
      // Non-blocking cache and publish
    }

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
