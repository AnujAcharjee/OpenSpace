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
  const exists = await redis.exists(cacheKey);

  if (exists) {
    const isMember = await redis.sismember(cacheKey, userId);
    return isMember === 1;
  }

  // Cache miss - hydrate from database
  const members = await prisma.chatRoomMember.findMany({
    where: { roomId },
    select: { userId: true },
  });

  if (members.length === 0) {
    return false;
  }

  const memberIds = members.map((m) => m.userId);
  await redis.sadd(cacheKey, ...memberIds);
  await redis.expire(cacheKey, 86400); // 24 hour TTL

  return memberIds.includes(userId);
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
