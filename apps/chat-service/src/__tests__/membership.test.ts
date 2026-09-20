import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockPipeline = {
  xadd: vi.fn().mockReturnThis(),
  publish: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([[null, 'ok'], [null, 1]]),
};

const { mockRedis, mockPrisma } = vi.hoisted(() => ({
  mockRedis: {
    sismember: vi.fn(),
    sadd: vi.fn(),
    smembers: vi.fn(),
    expire: vi.fn().mockResolvedValue(1),
    publish: vi.fn(),
    xadd: vi.fn(),
    pipeline: vi.fn(),
  },
  mockPrisma: {
    chatRoomMember: {
      findUnique: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
    },
  },
}));

mockRedis.pipeline.mockReturnValue(mockPipeline);

vi.mock('../lib/redis.js', () => ({
  redis: mockRedis,
}));

vi.mock('@repo/db', () => ({
  prisma: mockPrisma,
  MessageType: {
    TEXT: 'TEXT',
    IMAGE: 'IMAGE',
    AUDIO: 'AUDIO',
    VIDEO: 'VIDEO',
    FILE: 'FILE',
  },
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { isUserInRoom } from '../controllers/@helpers.js';
import { getRoomMessages } from '../controllers/getRoomMessages.js';
import { publishMessage } from '../controllers/publishMessage.js';

describe('Chat Service - Membership & Message Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.pipeline.mockReturnValue(mockPipeline);
  });

  describe('isUserInRoom (Self-Healing Cache & DB Fallback)', () => {
    it('should return true immediately if user is present in Redis membership set', async () => {
      mockRedis.sismember.mockResolvedValueOnce(1);

      const result = await isUserInRoom('room-1', 'user-1');

      expect(result).toBe(true);
      expect(mockRedis.sismember).toHaveBeenCalledWith('room:room-1:members', 'user-1');
      expect(mockPrisma.chatRoomMember.findUnique).not.toHaveBeenCalled();
    });

    it('should fallback to Prisma and hydrate Redis set if cache missed but DB has membership', async () => {
      mockRedis.sismember.mockResolvedValueOnce(0);
      mockPrisma.chatRoomMember.findUnique.mockResolvedValueOnce({
        id: 'member-1',
        roomId: 'room-1',
        userId: 'user-1',
      });
      mockRedis.sadd.mockResolvedValueOnce(1);
      mockRedis.expire.mockResolvedValueOnce(1);

      const result = await isUserInRoom('room-1', 'user-1');

      expect(result).toBe(true);
      expect(mockRedis.sismember).toHaveBeenCalledWith('room:room-1:members', 'user-1');
      expect(mockPrisma.chatRoomMember.findUnique).toHaveBeenCalledWith({
        where: {
          roomId_userId: {
            roomId: 'room-1',
            userId: 'user-1',
          },
        },
      });
      expect(mockRedis.sadd).toHaveBeenCalledWith('room:room-1:members', 'user-1');
      expect(mockRedis.expire).toHaveBeenCalledWith('room:room-1:members', 86400);
    });

    it('should return false if user is neither in Redis nor in DB', async () => {
      mockRedis.sismember.mockResolvedValueOnce(0);
      mockPrisma.chatRoomMember.findUnique.mockResolvedValueOnce(null);

      const result = await isUserInRoom('room-1', 'non-member-user');

      expect(result).toBe(false);
      expect(mockRedis.sadd).not.toHaveBeenCalled();
    });
  });

  describe('getRoomMessages Controller', () => {
    function createMockRes() {
      const res: Partial<Response> = {};
      res.status = vi.fn().mockReturnValue(res);
      res.json = vi.fn().mockReturnValue(res);
      return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
    }

    it('should return 401 if req.user is missing', async () => {
      const req = {
        params: { roomId: 'room-1' },
        query: {},
      } as unknown as Request;

      const res = createMockRes();

      await getRoomMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if requester is not a member of the room', async () => {
      mockRedis.sismember.mockResolvedValueOnce(0);
      mockPrisma.chatRoomMember.findUnique.mockResolvedValueOnce(null);

      const req = {
        params: { roomId: 'room-1' },
        query: {},
        user: { id: 'stranger-user' },
      } as unknown as Request;

      const res = createMockRes();

      await getRoomMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Only room members can view room messages',
        }),
      );
    });

    it('should return 200 with messages if requester is a verified member', async () => {
      mockRedis.sismember.mockResolvedValueOnce(1);
      mockPrisma.chatMessage.findMany.mockResolvedValueOnce([
        {
          id: 'msg-1',
          roomId: 'room-1',
          userId: 'user-1',
          type: 'TEXT',
          text: 'Welcome to the room!',
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
          user: { username: 'alice', avatarUrl: null },
        },
      ]);

      const req = {
        params: { roomId: 'room-1' },
        query: {},
        user: { id: 'user-1' },
      } as unknown as Request;

      const res = createMockRes();

      await getRoomMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                id: 'msg-1',
                text: 'Welcome to the room!',
                senderUsername: 'alice',
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('publishMessage Controller', () => {
    function createMockRes() {
      const res: Partial<Response> = {};
      res.status = vi.fn().mockReturnValue(res);
      res.json = vi.fn().mockReturnValue(res);
      return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
    }

    it('should reject publish with 403 if sender is not in room', async () => {
      mockRedis.sismember.mockResolvedValueOnce(0);
      mockPrisma.chatRoomMember.findUnique.mockResolvedValueOnce(null);

      const req = {
        body: {
          roomId: 'room-1',
          sender: 'non-member-user',
          text: 'Unauthorized message',
        },
      } as unknown as Request;

      const res = createMockRes();

      await publishMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should publish to room-scoped channel and Redis stream if sender is member', async () => {
      mockRedis.sismember.mockResolvedValueOnce(1);

      const req = {
        body: {
          roomId: 'room-1',
          sender: 'user-1',
          text: 'Hello team',
        },
      } as unknown as Request;

      const res = createMockRes();

      await publishMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.publish).toHaveBeenCalledWith(
        'room:room-1',
        expect.stringContaining('Hello team'),
      );
      expect(mockPipeline.xadd).toHaveBeenCalledWith(
        'stream:chat-messages',
        'MAXLEN',
        '~',
        100000,
        '*',
        'data',
        expect.any(String),
      );
    });
  });
});
