import { prisma, type ChatMessage, type User, MessageType } from '@repo/db';

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

export async function getRoomMemberIds(roomId: string): Promise<string[]> {
  const members = await prisma.chatRoomMember.findMany({
    where: { roomId },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}
