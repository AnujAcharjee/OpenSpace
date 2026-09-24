import {
  type User,
  type ChatRoom,
  type ChatRoomMember,
  type ChatRoomJoinRequest,
} from '@repo/db';
import type { RoomJoinRequestRecord, RoomMemberRecord, RoomRecord, UserRecord } from '@repo/validation';

export function toUserRecord(user: User): UserRecord {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt?.toISOString() ?? new Date(0).toISOString(),
    updatedAt: user.updatedAt?.toISOString() ?? new Date(0).toISOString(),
  };
}

export function toRoomMemberRecord(member: ChatRoomMember & { user?: User | null }): RoomMemberRecord {
  return {
    id: member.id,
    roomId: member.roomId,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt?.toISOString() ?? new Date(0).toISOString(),
    user: member.user ? toUserRecord(member.user) : null,
  };
}

export function toRoomJoinRequestRecord(
  joinRequest: ChatRoomJoinRequest & { user?: User | null },
): RoomJoinRequestRecord {
  return {
    id: joinRequest.id,
    roomId: joinRequest.roomId,
    userId: joinRequest.userId,
    status: joinRequest.status,
    createdAt: joinRequest.createdAt?.toISOString() ?? new Date(0).toISOString(),
    user: joinRequest.user ? toUserRecord(joinRequest.user) : null,
  };
}

export function toRoomRecord(
  room: ChatRoom & {
    creator?: User | null;
    members?: (ChatRoomMember & { user?: User | null })[];
  },
): RoomRecord {
  return {
    id: room.id,
    name: room.name,
    description: room.description ?? null,
    avatarUrl: room.avatarUrl ?? null,
    topics: room.topics ?? [],
    isPrivate: room.isPrivate,
    creatorId: room.creatorId ?? null,
    createdAt: room.createdAt?.toISOString() ?? new Date(0).toISOString(),
    updatedAt: room.updatedAt?.toISOString() ?? new Date(0).toISOString(),
    creator: room.creator ? toUserRecord(room.creator) : null,
    members: (room.members ?? []).map(toRoomMemberRecord),
  };
}
