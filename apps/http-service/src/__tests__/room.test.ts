import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const { mockRedis, mockPrisma } = vi.hoisted(() => ({
  mockRedis: {
    sadd: vi.fn(),
    srem: vi.fn(),
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
    },
    chatRoomMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    chatRoomJoinRequest: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
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
  JoinRequestStatus: {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
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
import { requestJoinRoomController } from '../controllers/room/requestJoinRoom.js';
import { createRoom } from '../controllers/room/createRoom.js';

describe('HTTP Service - Room Search & Join', () => {
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
          name: 'Collab Dev',
          description: 'Dev room',
          isPrivate: false,
          creatorId: 'a0000000-0000-0000-0000-000000000002',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { id: 'a0000000-0000-0000-0000-000000000002', username: 'alice', avatarUrl: null },
          members: [],
        },
      ]);

      const req = {
        query: { name: 'collab' },
      } as unknown as Request;

      const res = createMockRes();

      await searchRooms(req, res);

      expect(mockPrisma.chatRoom.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'collab',
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
        take: 50,
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            rooms: expect.arrayContaining([
              expect.objectContaining({ id: 'a0000000-0000-0000-0000-000000000001', name: 'Collab Dev' }),
            ]),
          }),
        }),
      );
    });

    it('should return all rooms ordered by updatedAt desc when name is empty', async () => {
      mockPrisma.chatRoom.findMany.mockResolvedValueOnce([]);

      const req = {
        query: { name: '   ' },
      } as unknown as Request;

      const res = createMockRes();

      await searchRooms(req, res);

      expect(mockPrisma.chatRoom.findMany).toHaveBeenCalledWith({
        where: {},
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
        take: 50,
      });

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('requestJoinRoomController', () => {
    it('should directly add member to DB and hydrate Redis set for public rooms', async () => {
      const roomId = 'a0000000-0000-0000-0000-000000000001';
      const userId = 'a0000000-0000-0000-0000-000000000002';
      const creatorId = 'a0000000-0000-0000-0000-000000000003';

      mockPrisma.chatRoom.findUnique.mockResolvedValueOnce({
        id: roomId,
        name: 'Public Room',
        isPrivate: false,
        creator: { id: creatorId, username: 'admin' },
        members: [{ id: 'm-1', userId: creatorId }],
      });
      mockPrisma.chatRoomMember.create.mockResolvedValueOnce({
        id: 'm-2',
        roomId,
        userId,
        role: 'MEMBER',
      });
      mockPrisma.chatRoom.findUnique.mockResolvedValueOnce({
        id: roomId,
        name: 'Public Room',
        isPrivate: false,
        creator: { id: creatorId, username: 'admin' },
        members: [
          { id: 'm-1', userId: creatorId, user: { username: 'admin' } },
          { id: 'm-2', userId, user: { username: 'new-user' } },
        ],
      });
      mockRedis.sadd.mockResolvedValueOnce(1);

      const req = {
        params: { id: roomId },
        body: { userId },
        user: { id: userId },
      } as unknown as Request;

      const res = createMockRes();

      await requestJoinRoomController(req, res);

      expect(mockPrisma.chatRoomMember.create).toHaveBeenCalled();
      expect(mockRedis.sadd).toHaveBeenCalledWith(`room:${roomId}:members`, userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            joined: true,
          }),
        }),
      );
    });

    it('should create join request for private rooms without adding to Redis immediately', async () => {
      const roomId = 'a0000000-0000-0000-0000-000000000001';
      const userId = 'a0000000-0000-0000-0000-000000000002';
      const creatorId = 'a0000000-0000-0000-0000-000000000003';

      mockPrisma.chatRoom.findUnique.mockResolvedValueOnce({
        id: roomId,
        name: 'Private Room',
        isPrivate: true,
        creator: { id: creatorId, username: 'admin' },
        members: [{ id: 'm-1', userId: creatorId }],
      });
      mockPrisma.chatRoomJoinRequest.upsert.mockResolvedValueOnce({
        id: 'req-1',
        roomId,
        userId,
        status: 'PENDING',
      });

      const req = {
        params: { id: roomId },
        body: { userId },
        user: { id: userId },
      } as unknown as Request;

      const res = createMockRes();

      await requestJoinRoomController(req, res);

      expect(mockPrisma.chatRoomJoinRequest.upsert).toHaveBeenCalled();
      expect(mockRedis.sadd).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            pending: true,
            joined: false,
          }),
        }),
      );
    });
  });

  describe('createRoom Controller', () => {
    it('should reject room creation if room name already exists', async () => {
      mockPrisma.chatRoom.findFirst.mockResolvedValueOnce({
        id: 'existing-room-1',
        name: 'General',
      });

      const req = {
        body: { name: 'General', isPrivate: false },
        user: { id: 'u-1' },
      } as unknown as Request;

      const res = createMockRes();

      await createRoom(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'A room with this name already exists',
      });
      expect(mockPrisma.chatRoom.create).not.toHaveBeenCalled();
    });

    it('should create room with unique name and return 201', async () => {
      mockPrisma.chatRoom.findFirst.mockResolvedValueOnce(null);
      mockPrisma.chatRoom.create.mockResolvedValueOnce({
        id: 'new-room-1',
        name: 'Unique Room',
        description: null,
        isPrivate: false,
        creatorId: 'u-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: 'u-1', username: 'alice', avatarUrl: null },
        members: [],
      });

      const req = {
        body: { name: 'Unique Room', isPrivate: false },
        user: { id: 'u-1' },
      } as unknown as Request;

      const res = createMockRes();

      await createRoom(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Room created successfully',
          data: expect.objectContaining({
            room: expect.objectContaining({
              name: 'Unique Room',
            }),
          }),
        }),
      );
    });
  });
});
