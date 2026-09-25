import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const { mockRedis, mockPrisma } = vi.hoisted(() => ({
  mockRedis: {
    sadd: vi.fn(),
    srem: vi.fn(),
    publish: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
  mockPrisma: {
    $transaction: vi.fn().mockImplementation(async (promises: any[]) => {
      return Promise.all(promises);
    }),
    chatRoom: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
    },
    chatRoomMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../lib/redis.js', () => ({
  redis: mockRedis,
}));

vi.mock('../lib/redis.js', () => ({
  redis: mockRedis,
}));

vi.mock('@repo/db', () => ({
  prisma: mockPrisma,
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
  RoomMemberRole: {
    MEMBER: 'MEMBER',
    ADMIN: 'ADMIN',
    OWNER: 'OWNER',
  },
  MessageType: {
    TEXT: 'TEXT',
    SYSTEM: 'SYSTEM',
    MEDIA: 'MEDIA',
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { updateRoomMemberRole } from '../controllers/room/updateRoomMemberRole.js';
import { removeRoomMember } from '../controllers/room/removeRoomMember.js';
import { deleteRoom } from '../controllers/room/deleteRoom.js';
import { editRoom } from '../controllers/room/editRoom.js';
import { leaveRoom } from '../controllers/room/leaveRoom.js';

function createMockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('Room Roles and Permissions', () => {
  const roomId = 'room-100';
  const superAdminUserId = 'user-owner';
  const adminUserId = 'user-admin';
  const memberUserId = 'user-member';
  const targetMemberUserId = 'user-target';

  const baseRoom = {
    id: roomId,
    name: 'general',
    description: 'General discussion',
    isPrivate: false,
    creatorId: superAdminUserId,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    creator: { id: superAdminUserId, username: 'superadmin' },
    members: [
      {
        id: 'member-owner',
        roomId,
        userId: superAdminUserId,
        role: 'OWNER',
        user: { id: superAdminUserId, username: 'superadmin' },
      },
      {
        id: 'member-admin',
        roomId,
        userId: adminUserId,
        role: 'ADMIN',
        user: { id: adminUserId, username: 'adminuser' },
      },
      {
        id: 'member-regular',
        roomId,
        userId: memberUserId,
        role: 'MEMBER',
        user: { id: memberUserId, username: 'regularuser' },
      },
      {
        id: 'member-target',
        roomId,
        userId: targetMemberUserId,
        role: 'MEMBER',
        user: { id: targetMemberUserId, username: 'targetuser' },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. updateRoomMemberRole: Super Admin transfer, Admin promotion & demotion
  // =========================================================================
  describe('updateRoomMemberRole', () => {
    it('allows Super Admin to promote a MEMBER to ADMIN', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      mockPrisma.chatRoomMember.update.mockResolvedValue({ id: 'member-target', role: 'ADMIN' });

      const req = {
        params: { id: roomId, memberId: 'member-target' },
        body: { role: 'ADMIN' },
        user: { id: superAdminUserId, username: 'superadmin' },
      } as unknown as Request;
      const res = createMockRes();

      await updateRoomMemberRole(req, res);

      expect(mockPrisma.chatRoomMember.update).toHaveBeenCalledWith({
        where: { id: 'member-target' },
        data: { role: 'ADMIN' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('allows an ADMIN to promote a MEMBER to ADMIN', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      mockPrisma.chatRoomMember.update.mockResolvedValue({ id: 'member-target', role: 'ADMIN' });

      const req = {
        params: { id: roomId, memberId: 'member-target' },
        body: { role: 'ADMIN' },
        user: { id: adminUserId, username: 'adminuser' },
      } as unknown as Request;
      const res = createMockRes();

      await updateRoomMemberRole(req, res);

      expect(mockPrisma.chatRoomMember.update).toHaveBeenCalledWith({
        where: { id: 'member-target' },
        data: { role: 'ADMIN' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects role update if actor is a regular MEMBER (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId, memberId: 'member-target' },
        body: { role: 'ADMIN' },
        user: { id: memberUserId, username: 'regularuser' },
      } as unknown as Request;
      const res = createMockRes();

      await expect(updateRoomMemberRole(req, res)).rejects.toThrow(
        'Only channel admins or the super admin can manage member roles',
      );
    });

    it('allows Super Admin to transfer OWNER: target becomes OWNER, actor becomes ADMIN, creatorId updates', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

      const req = {
        params: { id: roomId, memberId: 'member-target' },
        body: { role: 'OWNER' },
        user: { id: superAdminUserId, username: 'superadmin' },
      } as unknown as Request;
      const res = createMockRes();

      await updateRoomMemberRole(req, res);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            text: expect.stringContaining('is now the Super Admin'),
          }),
        }),
      );
    });

    it('rejects non-owner trying to transfer Super Admin ownership (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId, memberId: 'member-target' },
        body: { role: 'OWNER' },
        user: { id: adminUserId, username: 'adminuser' },
      } as unknown as Request;
      const res = createMockRes();

      await expect(updateRoomMemberRole(req, res)).rejects.toThrow(
        'Only the Super Admin can transfer channel ownership',
      );
    });

    it('allows Super Admin to demote an ADMIN to MEMBER', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      mockPrisma.chatRoomMember.update.mockResolvedValue({ id: 'member-admin', role: 'MEMBER' });

      const req = {
        params: { id: roomId, memberId: 'member-admin' },
        body: { role: 'MEMBER' },
        user: { id: superAdminUserId, username: 'superadmin' },
      } as unknown as Request;
      const res = createMockRes();

      await updateRoomMemberRole(req, res);

      expect(mockPrisma.chatRoomMember.update).toHaveBeenCalledWith({
        where: { id: 'member-admin' },
        data: { role: 'MEMBER' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects an ADMIN trying to demote another ADMIN to MEMBER (403)', async () => {
      // Room with 2 admins
      const roomWithTwoAdmins = {
        ...baseRoom,
        members: [
          ...baseRoom.members,
          {
            id: 'member-admin-2',
            roomId,
            userId: 'user-admin-2',
            role: 'ADMIN',
            user: { id: 'user-admin-2', username: 'admin2' },
          },
        ],
      };
      mockPrisma.chatRoom.findUnique.mockResolvedValue(roomWithTwoAdmins);

      const req = {
        params: { id: roomId, memberId: 'member-admin-2' },
        body: { role: 'MEMBER' },
        user: { id: adminUserId, username: 'adminuser' },
      } as unknown as Request;
      const res = createMockRes();

      await expect(updateRoomMemberRole(req, res)).rejects.toThrow(
        'Only the Super Admin can demote an Admin to Member',
      );
    });

    it('rejects demoting the Super Admin directly without transfer (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId, memberId: 'member-owner' },
        body: { role: 'MEMBER' },
        user: { id: superAdminUserId, username: 'superadmin' },
      } as unknown as Request;
      const res = createMockRes();

      await expect(updateRoomMemberRole(req, res)).rejects.toThrow(
        'Cannot modify your own role directly',
      );
    });
  });

  // =========================================================================
  // 2. removeRoomMember: member removal permissions
  // =========================================================================
  describe('removeRoomMember', () => {
    it('allows Admin to remove a regular Member', async () => {
      mockPrisma.chatRoom.findUnique
        .mockResolvedValueOnce(baseRoom)
        .mockResolvedValueOnce({
          ...baseRoom,
          members: baseRoom.members.filter((m) => m.id !== 'member-target'),
        });
      mockPrisma.chatRoomMember.delete.mockResolvedValue({ id: 'member-target' });

      const req = {
        params: { id: roomId, memberId: 'member-target' },
        user: { id: adminUserId, username: 'adminuser' },
      } as unknown as Request;
      const res = createMockRes();

      await removeRoomMember(req, res);

      expect(mockPrisma.chatRoomMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-target' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Member removed successfully',
        }),
      );
    });

    it('rejects Admin trying to remove another Admin (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId, memberId: 'member-admin' },
        user: { id: adminUserId, username: 'adminuser' },
      } as unknown as Request;
      const res = createMockRes();

      await expect(removeRoomMember(req, res)).rejects.toThrow(
        'To leave the channel, please use the leave room option',
      );
    });

    it('rejects Admin trying to remove an Admin when target is another user (403)', async () => {
      const roomWithTwoAdmins = {
        ...baseRoom,
        members: [
          ...baseRoom.members,
          {
            id: 'member-admin-2',
            roomId,
            userId: 'user-admin-2',
            role: 'ADMIN',
            user: { id: 'user-admin-2', username: 'admin2' },
          },
        ],
      };
      mockPrisma.chatRoom.findUnique.mockResolvedValue(roomWithTwoAdmins);

      const req = {
        params: { id: roomId, memberId: 'member-admin-2' },
        user: { id: adminUserId, username: 'adminuser' },
      } as unknown as Request;
      const res = createMockRes();

      await expect(removeRoomMember(req, res)).rejects.toThrow(
        'Only the Super Admin can remove an Admin',
      );
    });

    it('allows Super Admin to remove an Admin', async () => {
      mockPrisma.chatRoom.findUnique
        .mockResolvedValueOnce(baseRoom)
        .mockResolvedValueOnce({
          ...baseRoom,
          members: baseRoom.members.filter((m) => m.id !== 'member-admin'),
        });
      mockPrisma.chatRoomMember.delete.mockResolvedValue({ id: 'member-admin' });

      const req = {
        params: { id: roomId, memberId: 'member-admin' },
        user: { id: superAdminUserId, username: 'superadmin' },
      } as unknown as Request;
      const res = createMockRes();

      await removeRoomMember(req, res);

      expect(mockPrisma.chatRoomMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-admin' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects any attempt to remove the Super Admin (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId, memberId: 'member-owner' },
        user: { id: adminUserId, username: 'adminuser' },
      } as unknown as Request;
      const res = createMockRes();

      await expect(removeRoomMember(req, res)).rejects.toThrow(
        'Cannot remove the Super Admin of the channel',
      );
    });

    it('rejects regular Member trying to remove anyone (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId, memberId: 'member-target' },
        user: { id: memberUserId, username: 'regularuser' },
      } as unknown as Request;
      const res = createMockRes();

      await expect(removeRoomMember(req, res)).rejects.toThrow(
        'Only channel admins or the super admin can remove members',
      );
    });
  });

  // =========================================================================
  // 3. editRoom: channel management permissions
  // =========================================================================
  describe('editRoom', () => {
    it('allows Super Admin to edit room', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      mockPrisma.chatRoom.findFirst.mockResolvedValue(null);
      mockPrisma.chatRoom.update.mockResolvedValue({
        ...baseRoom,
        name: 'new-name',
      });

      const req = {
        params: { id: roomId },
        body: { name: 'new-name' },
        user: { id: superAdminUserId },
      } as unknown as Request;
      const res = createMockRes();

      await editRoom(req, res);

      expect(mockPrisma.chatRoom.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('allows Admin to edit room', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      mockPrisma.chatRoom.findFirst.mockResolvedValue(null);
      mockPrisma.chatRoom.update.mockResolvedValue({
        ...baseRoom,
        description: 'New Description',
      });

      const req = {
        params: { id: roomId },
        body: { description: 'New Description' },
        user: { id: adminUserId },
      } as unknown as Request;
      const res = createMockRes();

      await editRoom(req, res);

      expect(mockPrisma.chatRoom.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects regular Member trying to edit room (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId },
        body: { name: 'hacked-name' },
        user: { id: memberUserId },
      } as unknown as Request;
      const res = createMockRes();

      await expect(editRoom(req, res)).rejects.toThrow(
        'Only channel admins or the super admin can edit this channel',
      );
    });
  });

  // =========================================================================
  // 4. deleteRoom: room deletion permissions
  // =========================================================================
  describe('deleteRoom', () => {
    it('allows Super Admin to delete the room', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      mockPrisma.chatRoom.delete.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId },
        user: { id: superAdminUserId },
      } as unknown as Request;
      const res = createMockRes();

      await deleteRoom(req, res);

      expect(mockPrisma.chatRoom.delete).toHaveBeenCalledWith({
        where: { id: roomId },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects Admin trying to delete the room (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId },
        user: { id: adminUserId },
      } as unknown as Request;
      const res = createMockRes();

      await expect(deleteRoom(req, res)).rejects.toThrow(
        'Only the Super Admin can delete this channel',
      );
    });

    it('rejects regular Member trying to delete the room (403)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId },
        user: { id: memberUserId },
      } as unknown as Request;
      const res = createMockRes();

      await expect(deleteRoom(req, res)).rejects.toThrow(
        'Only the Super Admin can delete this channel',
      );
    });
  });

  // =========================================================================
  // 5. leaveRoom: Super Admin cannot leave without assigning another Super Admin
  // =========================================================================
  describe('leaveRoom constraints', () => {
    it('prevents Super Admin from leaving when other members exist (400)', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(baseRoom);

      const req = {
        params: { id: roomId },
        user: { id: superAdminUserId },
      } as unknown as Request;
      const res = createMockRes();

      await expect(leaveRoom(req, res)).rejects.toThrow(
        'You are the Super Admin of this channel. You cannot leave without assigning another Super Admin first',
      );
    });

    it('allows an Admin to leave the room (since Super Admin remains)', async () => {
      mockPrisma.chatRoom.findUnique
        .mockResolvedValueOnce(baseRoom)
        .mockResolvedValueOnce({
          ...baseRoom,
          members: baseRoom.members.filter((m) => m.userId !== adminUserId),
        });
      mockPrisma.chatRoomMember.delete.mockResolvedValue({ id: 'member-admin' });

      const req = {
        params: { id: roomId },
        user: { id: adminUserId },
      } as unknown as Request;
      const res = createMockRes();

      await leaveRoom(req, res);

      expect(mockPrisma.chatRoomMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-admin' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('allows a regular Member to leave the room', async () => {
      mockPrisma.chatRoom.findUnique
        .mockResolvedValueOnce(baseRoom)
        .mockResolvedValueOnce({
          ...baseRoom,
          members: baseRoom.members.filter((m) => m.userId !== memberUserId),
        });
      mockPrisma.chatRoomMember.delete.mockResolvedValue({ id: 'member-regular' });

      const req = {
        params: { id: roomId },
        user: { id: memberUserId },
      } as unknown as Request;
      const res = createMockRes();

      await leaveRoom(req, res);

      expect(mockPrisma.chatRoomMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-regular' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('allows Super Admin to leave if they are the sole remaining member', async () => {
      const roomWithSoleOwner = {
        ...baseRoom,
        members: [baseRoom.members[0]], // Only the owner
      };
      mockPrisma.chatRoom.findUnique
        .mockResolvedValueOnce(roomWithSoleOwner)
        .mockResolvedValueOnce(null);
      mockPrisma.chatRoomMember.delete.mockResolvedValue({ id: 'member-owner' });

      const req = {
        params: { id: roomId },
        user: { id: superAdminUserId },
      } as unknown as Request;
      const res = createMockRes();

      await leaveRoom(req, res);

      expect(mockPrisma.chatRoomMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-owner' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
