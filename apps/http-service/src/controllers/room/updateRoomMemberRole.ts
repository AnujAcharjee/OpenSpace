import type { Request, Response } from 'express';
import type { UpdateRoomMemberRoleRequest } from '@repo/validation';
import { v4 as uuidv4 } from 'uuid';
import { MessageType, prisma, RoomMemberRole } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { redis } from '../../lib/redis.js';
import { toRoomRecord } from '../@helpers.js';
import { AppError } from '../../utils/appError.js';

export const updateRoomMemberRole = async (req: Request, res: Response) => {
  const { id: roomId, memberId } = req.params as UpdateRoomMemberRoleRequest['params'];
  const { role } = req.body as UpdateRoomMemberRoleRequest['body'];
  const actorUserId = req.user?.id;

  if (!actorUserId) {
    throw new AppError('Authenticated user is required', 401);
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

  const actorMember = room.members.find((m) => m.userId === actorUserId);
  const isActorSuperAdmin =
    actorMember?.role === RoomMemberRole.OWNER || room.creatorId === actorUserId;
  const isActorAdmin = actorMember?.role === RoomMemberRole.ADMIN;

  if (!isActorSuperAdmin && !isActorAdmin) {
    throw new AppError('Only channel admins or the super admin can manage member roles', 403);
  }

  // Find target member
  const targetMember = room.members.find((m) => m.id === memberId);
  if (!targetMember) {
    throw new AppError('Member not found in this channel', 404);
  }

  if (targetMember.id === actorMember?.id) {
    throw new AppError('Cannot modify your own role directly', 400);
  }

  const targetRawName =
    targetMember.user?.username || targetMember.user?.name || 'A user';
  const targetCleanUsername = targetRawName.startsWith('@')
    ? targetRawName.slice(1)
    : targetRawName;

  const actorRawName =
    actorMember?.user?.username || actorMember?.user?.name || req.user?.username || 'Previous Super Admin';
  const actorCleanUsername = actorRawName.startsWith('@')
    ? actorRawName.slice(1)
    : actorRawName;

  let systemMessageText = '';

  if (role === RoomMemberRole.OWNER) {
    // Only current Super Admin can transfer ownership
    if (!isActorSuperAdmin) {
      throw new AppError('Only the Super Admin can transfer channel ownership', 403);
    }

    if (targetMember.role === RoomMemberRole.OWNER) {
      throw new AppError('This user is already the Super Admin', 400);
    }

    // Atomic transaction: target -> OWNER, actor -> ADMIN, room.creatorId -> target.userId
    await prisma.$transaction([
      prisma.chatRoomMember.update({
        where: { id: targetMember.id },
        data: { role: RoomMemberRole.OWNER },
      }),
      ...(actorMember
        ? [
            prisma.chatRoomMember.update({
              where: { id: actorMember.id },
              data: { role: RoomMemberRole.ADMIN },
            }),
          ]
        : []),
      prisma.chatRoom.update({
        where: { id: roomId },
        data: { creatorId: targetMember.userId, updatedAt: new Date() },
      }),
    ]);

    systemMessageText = `@${targetCleanUsername} is now the Super Admin. @${actorCleanUsername} is now an Admin.`;
  } else if (role === RoomMemberRole.ADMIN) {
    // Target is currently OWNER -> cannot demote to ADMIN without transferring ownership
    if (targetMember.role === RoomMemberRole.OWNER) {
      throw new AppError(
        'Cannot demote the Super Admin directly. You must transfer Super Admin ownership to another member.',
        403,
      );
    }

    if (targetMember.role === RoomMemberRole.ADMIN) {
      throw new AppError('This user is already an Admin', 400);
    }

    // Both Super Admin and Admin can promote a Member to Admin
    await prisma.chatRoomMember.update({
      where: { id: targetMember.id },
      data: { role: RoomMemberRole.ADMIN },
    });

    systemMessageText = `@${targetCleanUsername} is now an Admin`;
  } else if (role === RoomMemberRole.MEMBER) {
    // Target is currently OWNER
    if (targetMember.role === RoomMemberRole.OWNER) {
      throw new AppError(
        'Cannot demote the Super Admin directly. You must transfer Super Admin ownership to another member.',
        403,
      );
    }

    // Only Super Admin can demote an Admin
    if (targetMember.role === RoomMemberRole.ADMIN && !isActorSuperAdmin) {
      throw new AppError('Only the Super Admin can demote an Admin to Member', 403);
    }

    if (targetMember.role === RoomMemberRole.MEMBER) {
      throw new AppError('This user is already a Member', 400);
    }

    await prisma.chatRoomMember.update({
      where: { id: targetMember.id },
      data: { role: RoomMemberRole.MEMBER },
    });

    systemMessageText = `@${targetCleanUsername} is now a Member`;
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

  const systemMessageId = uuidv4();

  try {
    if (systemMessageText) {
      await prisma.chatMessage.create({
        data: {
          id: systemMessageId,
          roomId,
          userId: actorUserId,
          type: MessageType.SYSTEM,
          text: systemMessageText,
          updatedAt: new Date(),
        },
      });
    }

    const roomRecord = updatedRoom ? toRoomRecord(updatedRoom) : null;

    // 1. Broadcast room_updated so all client sidebars and member panels update in real time
    await redis.publish(
      `room:${roomId}`,
      JSON.stringify({
        type: 'room_updated',
        payload: { room: roomRecord },
      }),
    );

    // 2. Broadcast system message in room chat
    if (systemMessageText) {
      await redis.publish(
        `room:${roomId}`,
        JSON.stringify({
          type: 'chat_message',
          payload: {
            id: systemMessageId,
            sender: actorUserId,
            senderUsername: 'System',
            text: systemMessageText,
            roomId,
            type: 'SYSTEM',
            createdAt: new Date().toISOString(),
          },
        }),
      );
    }
  } catch (err) {
    logger.error({ err, roomId, memberId }, 'Failed to publish role update events');
  }

  return res.status(200).json({
    success: true,
    message: `Successfully updated member role to ${role}`,
    data: {
      room: updatedRoom ? toRoomRecord(updatedRoom) : null,
      memberId,
      role,
    },
  });
};
