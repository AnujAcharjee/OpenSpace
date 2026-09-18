import type { Request, Response } from 'express';
import type { RespondJoinRequestRequest as RespondJoinRequestInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, RoomMemberRole } from '@repo/db';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const respondJoinRequestController = async (req: Request, res: Response) => {
  const { requestId } = req.params as RespondJoinRequestInput['params'];
  const { approve } = req.body as RespondJoinRequestInput['body'];
  const actorUserId = req.user?.id;

  if (!actorUserId) {
    return res.status(401).json({
      success: false,
      error: 'Authenticated user is required',
    });
  }

  const joinRequest = await prisma.chatRoomJoinRequest.findUnique({
    where: { id: requestId },
    include: {
      chatRoom: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!joinRequest) {
    throw new AppError('Join request not found', 404);
  }

  const room = joinRequest.chatRoom;
  const actorMember = room.members.find((m) => m.userId === actorUserId);
  const isPrivileged =
    room.creatorId === actorUserId ||
    actorMember?.role === RoomMemberRole.OWNER ||
    actorMember?.role === RoomMemberRole.ADMIN;

  if (!isPrivileged) {
    return res.status(403).json({
      success: false,
      error: 'Only room owners and admins can respond to join requests',
    });
  }

  if (approve) {
    await prisma.$transaction([
      prisma.chatRoomMember.upsert({
        where: {
          roomId_userId: {
            roomId: joinRequest.roomId,
            userId: joinRequest.userId,
          },
        },
        update: {},
        create: {
          id: crypto.randomUUID(),
          roomId: joinRequest.roomId,
          userId: joinRequest.userId,
          role: RoomMemberRole.MEMBER,
        },
      }),
      prisma.chatRoomJoinRequest.delete({
        where: { id: requestId },
      }),
    ]);
  } else {
    await prisma.chatRoomJoinRequest.delete({
      where: { id: requestId },
    });
  }

  const updatedRoom = await prisma.chatRoom.findUnique({
    where: { id: joinRequest.roomId },
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
    message: approve ? 'Join request approved' : 'Join request rejected',
    data: {
      success: true,
      requestId,
      room: updatedRoom ? toRoomRecord(updatedRoom) : null,
    },
  });
};
