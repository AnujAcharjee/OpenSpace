import type { Request, Response } from 'express';
import type { AddRoomMembersRequest as AddRoomMembersInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, RoomMemberRole } from '@repo/db';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const addRoomMembers = async (req: Request, res: Response) => {
  const { id: roomId } = req.params as AddRoomMembersInput['params'];
  const { usernames } = req.body as AddRoomMembersInput['body'];

  const normalizedUsernames = [
    ...new Set(usernames.map((username) => username.trim().replace(/^@+/, ''))),
  ].filter(Boolean);

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  const users = await prisma.user.findMany({
    where: {
      username: { in: normalizedUsernames },
    },
  });

  if (users.length > 0) {
    await prisma.chatRoomMember.createMany({
      data: users.map((user) => ({
        id: crypto.randomUUID(),
        roomId,
        userId: user.id,
        role: RoomMemberRole.MEMBER,
      })),
      skipDuplicates: true,
    });
  }

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

  if (!updatedRoom) {
    throw new AppError('Room not found', 404);
  }

  return res.status(201).json({
    success: true,
    message: 'Members added successfully',
    data: {
      room: toRoomRecord(updatedRoom),
      addedCount: users.length,
    },
  });
};
