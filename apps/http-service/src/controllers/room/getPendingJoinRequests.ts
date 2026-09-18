import type { Request, Response } from 'express';
import type { GetPendingJoinRequestsRequest as GetPendingJoinRequestsInput } from '@repo/validation';
import { prisma, JoinRequestStatus, RoomMemberRole } from '@repo/db';
import { toRoomJoinRequestRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const getPendingJoinRequestsController = async (req: Request, res: Response) => {
  const { id: roomId } = req.params as GetPendingJoinRequestsInput['params'];
  const actorUserId = req.user?.id;

  if (!actorUserId) {
    return res.status(401).json({
      success: false,
      error: 'Authenticated user is required',
    });
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      members: true,
    },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  const actorMember = room.members.find((m) => m.userId === actorUserId);
  const isPrivileged =
    room.creatorId === actorUserId ||
    actorMember?.role === RoomMemberRole.OWNER ||
    actorMember?.role === RoomMemberRole.ADMIN;

  if (!isPrivileged) {
    return res.status(403).json({
      success: false,
      error: 'Only room owners and admins can view pending join requests',
    });
  }

  const requests = await prisma.chatRoomJoinRequest.findMany({
    where: {
      roomId,
      status: JoinRequestStatus.PENDING,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return res.status(200).json({
    success: true,
    data: {
      requests: requests.map(toRoomJoinRequestRecord),
    },
  });
};
