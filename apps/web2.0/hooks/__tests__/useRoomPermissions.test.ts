import { describe, it, expect } from 'vitest';
import { useRoomPermissions } from '../useRoomPermissions';
import type { RoomRecord } from '@repo/validation';

describe('useRoomPermissions hook', () => {
  const mockRoom: RoomRecord = {
    id: 'room-1',
    name: 'test-channel',
    description: 'Test channel description',
    avatarUrl: null,
    topics: ['general'],
    isPrivate: false,
    creatorId: 'user-owner',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    creator: {
      id: 'user-owner',
      email: 'owner@test.com',
      username: 'owner',
      name: 'Channel Owner',
      bio: null,
      avatarUrl: null,
      lastLogin: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    members: [
      {
        id: 'member-1',
        roomId: 'room-1',
        userId: 'user-owner',
        role: 'OWNER',
        createdAt: '2026-01-01T00:00:00.000Z',
        user: {
          id: 'user-owner',
          email: 'owner@test.com',
          username: 'owner',
          name: 'Channel Owner',
          bio: null,
          avatarUrl: null,
          lastLogin: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        id: 'member-2',
        roomId: 'room-1',
        userId: 'user-admin',
        role: 'ADMIN',
        createdAt: '2026-01-01T00:00:00.000Z',
        user: {
          id: 'user-admin',
          email: 'admin@test.com',
          username: 'admin',
          name: 'Admin User',
          bio: null,
          avatarUrl: null,
          lastLogin: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        id: 'member-3',
        roomId: 'room-1',
        userId: 'user-member',
        role: 'MEMBER',
        createdAt: '2026-01-01T00:00:00.000Z',
        user: {
          id: 'user-member',
          email: 'member@test.com',
          username: 'member',
          name: 'Member User',
          bio: null,
          avatarUrl: null,
          lastLogin: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ],
  };

  it('correctly resolves Super Admin permissions', () => {
    const perms = useRoomPermissions(mockRoom, 'user-owner');
    expect(perms.isOwner).toBe(true);
    expect(perms.isAdmin).toBe(false);
    expect(perms.isMember).toBe(false);
    expect(perms.canManageRoom).toBe(true);
  });

  it('correctly resolves Admin permissions', () => {
    const perms = useRoomPermissions(mockRoom, 'user-admin');
    expect(perms.isOwner).toBe(false);
    expect(perms.isAdmin).toBe(true);
    expect(perms.isMember).toBe(false);
    expect(perms.canManageRoom).toBe(true);
  });

  it('correctly resolves regular Member permissions', () => {
    const perms = useRoomPermissions(mockRoom, 'user-member');
    expect(perms.isOwner).toBe(false);
    expect(perms.isAdmin).toBe(false);
    expect(perms.isMember).toBe(true);
    expect(perms.canManageRoom).toBe(false);
  });

  it('correctly resolves non-member / visitor permissions', () => {
    const perms = useRoomPermissions(mockRoom, 'user-outsider');
    expect(perms.isOwner).toBe(false);
    expect(perms.isAdmin).toBe(false);
    expect(perms.isMember).toBe(false);
    expect(perms.canManageRoom).toBe(false);
  });

  it('handles null room safely', () => {
    const perms = useRoomPermissions(null, 'user-owner');
    expect(perms.isOwner).toBe(false);
    expect(perms.isAdmin).toBe(false);
    expect(perms.isMember).toBe(false);
    expect(perms.canManageRoom).toBe(false);
  });
});
