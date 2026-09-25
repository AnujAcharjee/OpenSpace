import type { Request, Response } from 'express';
import type { EditRoomRequest as EditRoomInput } from '@repo/validation';
import { prisma, Prisma, RoomMemberRole } from '@repo/db';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const editRoom = async (req: Request, res: Response) => {
  const data = req.body as EditRoomInput['body'];
  const { id } = req.params as EditRoomInput['params'];
  const actorUserId = req.user?.id;

  if (!actorUserId) {
    throw new AppError('Authenticated user is required', 401);
  }

  const existingRoom = await prisma.chatRoom.findUnique({
    where: { id },
    include: {
      members: true,
    },
  });

  if (!existingRoom) {
    throw new AppError('Room not found', 404);
  }

  const actorMember = existingRoom.members.find((m) => m.userId === actorUserId);
  const canEdit =
    actorMember?.role === RoomMemberRole.OWNER ||
    actorMember?.role === RoomMemberRole.ADMIN ||
    existingRoom.creatorId === actorUserId;

  if (!canEdit) {
    throw new AppError('Only channel admins or the super admin can edit this channel', 403);
  }

  if (data.name !== undefined) {
    const duplicateRoom = await prisma.chatRoom.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: data.name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (duplicateRoom) {
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
        ...(data.topics !== undefined && { topics: data.topics }),
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

    const roomRecord = toRoomRecord(updatedRoom);

    try {
      await redis.publish(
        `room:${id}`,
        JSON.stringify({
          type: 'room_updated',
          payload: { room: roomRecord },
        }),
      );
    } catch {
      // Non-blocking publish
    }

    return res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: { room: roomRecord },
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
