import { prisma, type ChatMessage, type User, MessageType } from '@repo/db';
import { redis } from '../lib/redis.js';

export type ChatMessageRecord = {
  id: string;
  type: keyof typeof MessageType;
  userId: string;
  roomId: string;
  text?: string;
  attachments?: string;
  parentId?: string;
  isDeleted: boolean;
  modifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  senderUsername: string;
  senderAvatarUrl?: string;
};

export function toChatMessageRecord(
  message: ChatMessage & { user?: User | null },
): ChatMessageRecord {
  return {
    id: message.id,
    type: message.type,
    userId: message.userId,
    roomId: message.roomId,
    text: message.text || undefined,
    attachments: message.attachments ? (typeof message.attachments === 'string' ? message.attachments : JSON.stringify(message.attachments)) : undefined,
    parentId: message.parentId ?? undefined,
    isDeleted: message.isDeleted,
    modifiedAt: message.modifiedAt?.toISOString(),
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    senderUsername: message.user?.username ?? 'Unknown',
    senderAvatarUrl: message.user?.avatarUrl ?? undefined,
  };
}

export async function isUserInRoom(roomId: string, userId: string): Promise<boolean> {
  const cacheKey = `room:${roomId}:members`;
  const isMember = await redis.sismember(cacheKey, userId);

  if (isMember === 1) {
    return true;
  }

  // Double check database in case member joined recently or cache is incomplete
  const member = await prisma.chatRoomMember.findUnique({
    where: {
      roomId_userId: { roomId, userId },
    },
  });

  if (member) {
    // Self-healing: add member to Redis Set
    await redis.sadd(cacheKey, userId);
    await redis.expire(cacheKey, 86400);
    return true;
  }

  return false;
}

export async function getRoomMemberIds(roomId: string): Promise<string[]> {
  const cacheKey = `room:${roomId}:members`;
  const cachedMembers = await redis.smembers(cacheKey);

  if (cachedMembers && cachedMembers.length > 0) {
    return cachedMembers;
  }

  const members = await prisma.chatRoomMember.findMany({
    where: { roomId },
    select: { userId: true },
  });

  const memberIds = members.map((m) => m.userId);
  if (memberIds.length > 0) {
    await redis.sadd(cacheKey, ...memberIds);
    await redis.expire(cacheKey, 86400);
  }

  return memberIds;
}
