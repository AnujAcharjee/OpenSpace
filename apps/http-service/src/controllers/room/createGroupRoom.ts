import type { Request, Response } from 'express';
import type { CreateGroupRoomInput } from '@repo/validation';
import crypto from 'crypto';
import { prisma, RoomMemberRole, MessageType } from '@repo/db';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const createGroupRoom = async (req: Request, res: Response) => {
  const { name, description, avatarUrl, memberUsernames = [] } = req.body as CreateGroupRoomInput;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    throw new AppError('Authenticated user is required', 401);
  }

  // Resolve additional members by usernames
  const cleanUsernames = memberUsernames
    .map((u) => u.trim().replace(/^@+/, ''))
    .filter(Boolean);

  let initialMembers: Array<{ id: string; userId: string; role: RoomMemberRole }> = [
    {
      id: crypto.randomUUID(),
      userId: currentUserId,
      role: RoomMemberRole.OWNER,
    },
  ];

  if (cleanUsernames.length > 0) {
    const matchedUsers = await prisma.user.findMany({
      where: {
        username: {
          in: cleanUsernames,
          mode: 'insensitive',
        },
        id: {
          not: currentUserId,
        },
      },
      select: { id: true },
    });

    const additionalMembers = matchedUsers.map((u) => ({
      id: crypto.randomUUID(),
      userId: u.id,
      role: RoomMemberRole.MEMBER,
    }));

    initialMembers = [...initialMembers, ...additionalMembers];
  }

  const roomId = crypto.randomUUID();

  const newRoom = await prisma.chatRoom.create({
    data: {
      id: roomId,
      type: 'GROUP',
      name: name.trim(),
      description: description?.trim() || null,
      avatarUrl: avatarUrl?.trim() || null,
      creatorId: currentUserId,
      updatedAt: new Date(),
      members: {
        create: initialMembers,
      },
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

  const roomRecord = toRoomRecord(newRoom);
  const allMemberUserIds = initialMembers.map((m) => m.userId);

  try {
    await redis.sadd(`room:${roomId}:members`, ...allMemberUserIds);
    await redis.expire(`room:${roomId}:members`, 86400);

    // Create system message for group creation
    const creatorUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    const creatorName = creatorUser?.username || 'Admin';
    const systemMsgId = crypto.randomUUID();
    const systemText = `@${creatorName} created the group "${name.trim()}"`;

    await prisma.chatMessage.create({
      data: {
        id: systemMsgId,
        roomId,
        userId: currentUserId,
        type: MessageType.SYSTEM,
        text: systemText,
        updatedAt: new Date(),
      },
    });

    const joinPayload = JSON.stringify({
      type: 'room_joined',
      payload: { room: roomRecord },
    });

    for (const memberId of allMemberUserIds) {
      await redis.publish(`user:${memberId}`, joinPayload);
    }
  } catch {
    // Non-blocking cache & live event dispatch
  }

  return res.status(201).json({
    success: true,
    message: 'Group created successfully',
    data: { room: roomRecord },
  });
};
