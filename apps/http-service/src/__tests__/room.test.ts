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
    chatRoom: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
    },
    chatRoomMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
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
      findMany: vi.fn().mockResolvedValue([]),
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

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { searchRooms } from '../controllers/room/searchRooms.js';
import { createDirectRoom } from '../controllers/room/createDirectRoom.js';
import { createGroupRoom } from '../controllers/room/createGroupRoom.js';
import { createRoom } from '../controllers/room/createRoom.js';
import { leaveRoom } from '../controllers/room/leaveRoom.js';

describe('HTTP Service - Room Management (1-to-1 and Groups)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRes() {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  }

  describe('searchRooms Controller', () => {
    it('should search rooms by case-insensitive name filter and order by updatedAt desc', async () => {
      mockPrisma.chatRoom.findMany.mockResolvedValueOnce([
        {
          id: 'a0000000-0000-0000-0000-000000000001',
          type: 'GROUP',
          name: 'Engineering Team',
          description: 'Dev room',
          creatorId: 'a0000000-0000-0000-0000-000000000002',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { id: 'a0000000-0000-0000-0000-000000000002', username: 'alice', avatarUrl: null },
          members: [],
        },
      ]);

      const req = {
        query: { name: 'engineering' },
      } as unknown as Request;

      const res = createMockRes();

      await searchRooms(req, res);

      expect(mockPrisma.chatRoom.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'engineering',
            mode: 'insensitive',
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
        orderBy: {
          updatedAt: 'desc',
        },
        skip: 0,
        take: 20,
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            rooms: expect.arrayContaining([
              expect.objectContaining({ id: 'a0000000-0000-0000-0000-000000000001', name: 'Engineering Team' }),
            ]),
          }),
        }),
      );
    });
  });

  describe('createDirectRoom Controller', () => {
    it('should create a new 1-to-1 conversation if none exists', async () => {
      const currentUserId = 'u-00000000-0000-0000-0000-000000000001';
      const targetUserId = 'u-00000000-0000-0000-0000-000000000002';

      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: targetUserId, username: 'bob' });
      mockPrisma.chatRoom.findFirst.mockResolvedValueOnce(null);

      mockPrisma.chatRoom.create.mockResolvedValueOnce({
        id: 'r-direct-1',
        type: 'DIRECT',
        name: null,
        description: null,
        avatarUrl: null,
        creatorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          { id: 'm-1', userId: currentUserId, role: 'MEMBER' },
          { id: 'm-2', userId: targetUserId, role: 'MEMBER' },
        ],
      });

      const req = {
        user: { id: currentUserId },
        body: { targetUserId },
      } as unknown as Request;

      const res = createMockRes();

      await createDirectRoom(req, res);

      expect(mockPrisma.chatRoom.create).toHaveBeenCalled();
      expect(mockRedis.sadd).toHaveBeenCalledWith('room:r-direct-1:members', currentUserId, targetUserId);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return existing direct conversation if already present', async () => {
      const currentUserId = 'u-00000000-0000-0000-0000-000000000001';
      const targetUserId = 'u-00000000-0000-0000-0000-000000000002';

      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: targetUserId, username: 'bob' });
      mockPrisma.chatRoom.findFirst.mockResolvedValueOnce({
        id: 'r-direct-existing',
        type: 'DIRECT',
        name: null,
        members: [],
      });

      const req = {
        user: { id: currentUserId },
        body: { targetUserId },
      } as unknown as Request;

      const res = createMockRes();

      await createDirectRoom(req, res);

      expect(mockPrisma.chatRoom.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            room: expect.objectContaining({ id: 'r-direct-existing' }),
          }),
        }),
      );
    });
  });

  describe('createGroupRoom Controller', () => {
    it('should create a group room and register creator as OWNER', async () => {
      const currentUserId = 'u-00000000-0000-0000-0000-000000000001';

      mockPrisma.chatRoom.create.mockResolvedValueOnce({
        id: 'r-group-1',
        type: 'GROUP',
        name: 'Design Crew',
        description: 'Design chat',
        avatarUrl: null,
        creatorId: currentUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [{ id: 'm-1', userId: currentUserId, role: 'OWNER' }],
      });

      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: currentUserId, username: 'alice' });
      mockPrisma.chatMessage.create.mockResolvedValueOnce({});

      const req = {
        user: { id: currentUserId },
        body: {
          name: 'Design Crew',
          description: 'Design chat',
          memberUsernames: [],
        },
      } as unknown as Request;

      const res = createMockRes();

      await createGroupRoom(req, res);

      expect(mockPrisma.chatRoom.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
