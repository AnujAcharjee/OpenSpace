import type { Request, Response } from 'express';
import type { RemoveRoomMemberRequest as RemoveRoomMemberInput } from '@repo/validation';
import { v4 as uuidv4 } from 'uuid';
import { MessageType, prisma, Prisma, RoomMemberRole } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const removeRoomMember = async (req: Request, res: Response) => {
  const { id: roomId, memberId } = req.params as RemoveRoomMemberInput['params'];
  const actorUserId = req.user?.id;

  if (!actorUserId) {
    throw new AppError('Authenticated user is required', 401);
  }

  const roomBeforeRemoval = await prisma.chatRoom.findUnique({
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

  if (!roomBeforeRemoval) {
    throw new AppError('Room not found', 404);
  }

  const actorMember = roomBeforeRemoval.members.find((member) => member.userId === actorUserId);
  const isActorSuperAdmin =
    actorMember?.role === RoomMemberRole.OWNER || roomBeforeRemoval.creatorId === actorUserId;
  const isActorAdmin = actorMember?.role === RoomMemberRole.ADMIN;

  if (!isActorSuperAdmin && !isActorAdmin) {
    throw new AppError('Only channel admins or the super admin can remove members', 403);
  }

  const removedMember = roomBeforeRemoval.members.find((member) => member.id === memberId);
  if (!removedMember) {
    throw new AppError('Room member not found', 404);
  }

  if (removedMember.userId === actorUserId) {
    throw new AppError('To leave the channel, please use the leave room option', 400);
  }

  if (removedMember.role === RoomMemberRole.OWNER || roomBeforeRemoval.creatorId === removedMember.userId) {
    throw new AppError('Cannot remove the Super Admin of the channel', 403);
  }

  if (removedMember.role === RoomMemberRole.ADMIN && !isActorSuperAdmin) {
    throw new AppError('Only the Super Admin can remove an Admin', 403);
  }

  try {
    await prisma.chatRoomMember.delete({
      where: { id: memberId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError('Room member not found', 404);
    }
    throw error;
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

  if (removedMember) {
    const rawUsername = removedMember.user?.username || removedMember.user?.name || 'A user';
    const removedUsername = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
    const systemMessageId = uuidv4();
    const systemMessageText = `@${removedUsername} was removed from the room`;

    try {
      await prisma.chatMessage.create({
        data: {
          id: systemMessageId,
          roomId,
          userId: removedMember.userId,
          type: MessageType.SYSTEM,
          text: systemMessageText,
          updatedAt: new Date(),
        },
      });
    } catch (dbError) {
      logger.error({ dbError, roomId, memberId }, 'Failed to persist remove member system message');
    }

    try {
      // 1. Notify remaining room members via room-scoped channel
      await redis.publish(
        `room:${roomId}`,
        JSON.stringify({
          type: 'chat_message',
          payload: {
            id: systemMessageId,
            sender: removedMember.userId,
            senderUsername: removedUsername,
            senderAvatarUrl: removedMember.user?.avatarUrl ?? null,
            text: systemMessageText,
            roomId,
            type: 'SYSTEM',
            createdAt: new Date().toISOString(),
          },
        }),
      );

      // 2. Notify the removed user specifically via their user-scoped channel
      const removalPayload = {
        type: 'room_member_removed',
        payload: {
          roomId,
          removedUserId: removedMember.userId,
          removedUsername,
        },
      };

      await redis.publish(`user:${removedMember.userId}`, JSON.stringify(removalPayload));
      await redis.publish(`room:${roomId}`, JSON.stringify(removalPayload));

      // 3. Broadcast room_updated with updated room record
      await redis.publish(
        `room:${roomId}`,
        JSON.stringify({
          type: 'room_updated',
          payload: { room: toRoomRecord(room) },
        }),
      );

      // 4. Evict from Redis membership cache
      await redis.srem(`room:${roomId}:members`, removedMember.userId);
    } catch (publishError) {
      logger.error({ publishError, roomId, memberId }, 'Room member removed but WS publish failed');
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    data: {
      room: toRoomRecord(room),
      id: memberId,
    },
  });
};
