import type { Request, Response } from 'express';
import type { RequestJoinRoomRequest as RequestJoinRoomInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, RoomMemberRole, JoinRequestStatus } from '@repo/db';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const requestJoinRoomController = async (req: Request, res: Response) => {
  const { id: roomId } = req.params as RequestJoinRoomInput['params'];
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authenticated user is required',
    });
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      creator: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  const existingMember = room.members.find((m) => m.userId === userId);
  if (existingMember) {
    return res.status(200).json({
      success: true,
      message: 'Already a member of this room',
      data: {
        room: toRoomRecord(room),
        joined: true,
        pending: false,
      },
    });
  }

  if (!room.isPrivate) {
    // Public room: join directly
    await prisma.chatRoomMember.create({
      data: {
        id: crypto.randomUUID(),
        roomId,
        userId,
        role: RoomMemberRole.MEMBER,
      },
    });

    const updatedRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
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
      message: 'Joined room successfully',
      data: {
        room: updatedRoom ? toRoomRecord(updatedRoom) : null,
        joined: true,
        pending: false,
      },
    });
  }

  // Private room: create pending join request
  await prisma.chatRoomJoinRequest.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    update: {
      status: JoinRequestStatus.PENDING,
      updatedAt: new Date(),
    },
    create: {
      id: crypto.randomUUID(),
      roomId,
      userId,
      status: JoinRequestStatus.PENDING,
      updatedAt: new Date(),
    },
  });

  return res.status(200).json({
    success: true,
    message: 'Join request sent',
    data: {
      room: null,
      joined: false,
      pending: true,
    },
  });
};
