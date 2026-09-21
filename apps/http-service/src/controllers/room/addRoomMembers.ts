import type { Request, Response } from 'express';
import type { AddRoomMembersRequest as AddRoomMembersInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, RoomMemberRole, MessageType } from '@repo/db';
import { redis } from '../../lib/redis.js';
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

    try {
      await redis.sadd(`room:${roomId}:members`, ...users.map((u) => u.id));
      await redis.expire(`room:${roomId}:members`, 86400);
    } catch (err) {
      // Non-blocking cache update
    }
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

  const roomRecord = toRoomRecord(updatedRoom);

  try {
    // Notify all added users and publish system messages
    for (const user of users) {
      const username = user.username || user.name || 'A user';
      const systemMessageId = crypto.randomUUID();
      const systemMessageText = `@${username} joined the room`;

      await prisma.chatMessage.create({
        data: {
          id: systemMessageId,
          roomId,
          userId: user.id,
          type: MessageType.SYSTEM,
          text: systemMessageText,
          updatedAt: new Date(),
        },
      });

      await redis.publish(
        `user:${user.id}`,
        JSON.stringify({
          type: 'room_joined',
          payload: { room: roomRecord },
        }),
      );
      await redis.publish(
        `user:${user.id}`,
        JSON.stringify({
          type: 'notification',
          payload: {
            title: 'Added to Room',
            body: `You were added to #${updatedRoom.name}`,
            timestamp: Date.now(),
          },
        }),
      );
      await redis.publish(
        `room:${roomId}`,
        JSON.stringify({
          type: 'chat_message',
          payload: {
            id: systemMessageId,
            sender: user.id,
            text: systemMessageText,
            roomId,
            createdAt: new Date().toISOString(),
            senderUsername: username,
            senderAvatarUrl: user.avatarUrl ?? null,
            type: 'SYSTEM',
          },
        }),
      );
    }

    // Broadcast updated room info to room channel
    await redis.publish(
      `room:${roomId}`,
      JSON.stringify({
        type: 'room_updated',
        payload: { room: roomRecord },
      }),
    );
  } catch (err) {
    // Non-blocking notification dispatch
  }

  return res.status(201).json({
    success: true,
    message: 'Members added successfully',
    data: {
      room: roomRecord,
      addedCount: users.length,
    },
  });
};
