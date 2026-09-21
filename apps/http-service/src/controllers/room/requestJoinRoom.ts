import type { Request, Response } from 'express';
import type { RequestJoinRoomRequest as RequestJoinRoomInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, RoomMemberRole, JoinRequestStatus, MessageType } from '@repo/db';
import { redis } from '../../lib/redis.js';
import { toRoomRecord, toRoomJoinRequestRecord } from '../@helpers.js';
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const username = user?.username || user?.name || 'A user';
    const systemMessageId = crypto.randomUUID();
    const systemMessageText = `@${username} joined the room`;

    await prisma.chatMessage.create({
      data: {
        id: systemMessageId,
        roomId,
        userId,
        type: MessageType.SYSTEM,
        text: systemMessageText,
        updatedAt: new Date(),
      },
    });

    try {
      await redis.sadd(`room:${roomId}:members`, userId);
      await redis.expire(`room:${roomId}:members`, 86400);
    } catch {
      // Non-blocking cache update
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

    const roomRecord = updatedRoom ? toRoomRecord(updatedRoom) : null;

    if (roomRecord) {
      try {
        await redis.publish(
          `user:${userId}`,
          JSON.stringify({
            type: 'room_joined',
            payload: { room: roomRecord },
          }),
        );
        await redis.publish(
          `room:${roomId}`,
          JSON.stringify({
            type: 'room_updated',
            payload: { room: roomRecord },
          }),
        );
        await redis.publish(
          `room:${roomId}`,
          JSON.stringify({
            type: 'chat_message',
            payload: {
              id: systemMessageId,
              sender: userId,
              text: systemMessageText,
              roomId,
              createdAt: new Date().toISOString(),
              senderUsername: username,
              senderAvatarUrl: user?.avatarUrl ?? null,
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
      message: 'Joined room successfully',
      data: {
        room: roomRecord,
        joined: true,
        pending: false,
      },
    });
  }

  // Private room: create pending join request
  const joinRequest = await prisma.chatRoomJoinRequest.upsert({
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
    include: {
      user: true,
    },
  });

  try {
    const adminUserIds = new Set<string>();
    room.members.forEach((m) => {
      if (m.role === RoomMemberRole.OWNER || m.role === RoomMemberRole.ADMIN) {
        adminUserIds.add(m.userId);
      }
    });
    if (room.creatorId) {
      adminUserIds.add(room.creatorId);
    }

    const requesterName = joinRequest.user?.username || joinRequest.user?.name || 'A user';

    const joinRequestNotification = JSON.stringify({
      type: 'notification',
      payload: {
        title: 'New Join Request',
        body: `@${requesterName} requested to join "${room.name}"`,
        timestamp: Date.now(),
      },
    });

    const requestRecord = toRoomJoinRequestRecord(joinRequest);
    const joinRequestedWsEvent = JSON.stringify({
      type: 'room_join_requested',
      payload: {
        roomId,
        request: requestRecord,
      },
    });

    // Publish to room channel for open room viewers
    await redis.publish(`room:${roomId}`, joinRequestedWsEvent);

    // Publish to online admins
    for (const adminId of adminUserIds) {
      await redis.publish(`user:${adminId}`, joinRequestedWsEvent);
      await redis.publish(`user:${adminId}`, joinRequestNotification);
    }
  } catch {
    // Non-blocking notification dispatch
  }

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
