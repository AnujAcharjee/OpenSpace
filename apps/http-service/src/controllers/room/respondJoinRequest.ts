import type { Request, Response } from 'express';
import type { RespondJoinRequestRequest as RespondJoinRequestInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, RoomMemberRole, MessageType } from '@repo/db';
import { redis } from '../../lib/redis.js';
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
      user: true,
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

    try {
      await redis.sadd(`room:${joinRequest.roomId}:members`, joinRequest.userId);
      await redis.expire(`room:${joinRequest.roomId}:members`, 86400);
    } catch (err) {
      // Non-blocking cache update
    }
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

  const roomRecord = updatedRoom ? toRoomRecord(updatedRoom) : null;

  if (approve && roomRecord) {
    const joiningUser = joinRequest.user ?? (await prisma.user.findUnique({ where: { id: joinRequest.userId } }));
    const username = joiningUser?.username || joiningUser?.name || 'A user';
    const systemMessageId = crypto.randomUUID();
    const systemMessageText = `@${username} joined the room`;

    try {
      await prisma.chatMessage.create({
        data: {
          id: systemMessageId,
          roomId: joinRequest.roomId,
          userId: joinRequest.userId,
          type: MessageType.SYSTEM,
          text: systemMessageText,
          updatedAt: new Date(),
        },
      });

      await redis.publish(
        `user:${joinRequest.userId}`,
        JSON.stringify({
          type: 'room_joined',
          payload: { room: roomRecord },
        }),
      );
      await redis.publish(
        `user:${joinRequest.userId}`,
        JSON.stringify({
          type: 'notification',
          payload: {
            title: 'Join Request Approved',
            body: `Your request to join #${updatedRoom?.name} was approved!`,
            timestamp: Date.now(),
          },
        }),
      );
      await redis.publish(
        `room:${joinRequest.roomId}`,
        JSON.stringify({
          type: 'room_updated',
          payload: { room: roomRecord },
        }),
      );
      await redis.publish(
        `room:${joinRequest.roomId}`,
        JSON.stringify({
          type: 'chat_message',
          payload: {
            id: systemMessageId,
            sender: joinRequest.userId,
            text: systemMessageText,
            roomId: joinRequest.roomId,
            createdAt: new Date().toISOString(),
            senderUsername: username,
            senderAvatarUrl: joiningUser?.avatarUrl ?? null,
            type: 'SYSTEM',
          },
        }),
      );
    } catch {
      // Non-blocking notification
    }
  }

  return res.status(200).json({
    success: true,
    message: approve ? 'Join request approved' : 'Join request rejected',
    data: {
      success: true,
      requestId,
      room: roomRecord,
    },
  });
};
