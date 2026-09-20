import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRedis, mockPrisma } = vi.hoisted(() => ({
  mockRedis: {
    xgroup: vi.fn(),
    xreadgroup: vi.fn(),
    xautoclaim: vi.fn(),
    xack: vi.fn(),
    xadd: vi.fn(),
  },
  mockPrisma: {
    chatMessage: {
      createMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

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

import { StreamWorker } from '../lib/streamWorker.js';

describe('Chat Service - StreamWorker Resilience & DLQ', () => {
  let worker: StreamWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new StreamWorker();
  });

  it('should process valid batch and persist messages via createMany in fast-path', async () => {
    const validMessagePayload = JSON.stringify({
      id: 'msg-101',
      sender: 'user-1',
      roomId: 'room-1',
      text: 'Hello fast path',
      createdAt: new Date().toISOString(),
    });

    const messages: Array<[string, string[]]> = [
      ['1710000000000-0', ['data', validMessagePayload]],
    ];

    mockPrisma.chatMessage.createMany.mockResolvedValueOnce({ count: 1 });
    mockRedis.xack.mockResolvedValueOnce(1);

    await (worker as any).processMessageBatch(messages);

    expect(mockPrisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'msg-101',
          userId: 'user-1',
          roomId: 'room-1',
          text: 'Hello fast path',
        }),
      ]),
      skipDuplicates: true,
    });
    expect(mockRedis.xack).toHaveBeenCalledWith(
      'stream:chat-messages',
      'chat-service-group',
      '1710000000000-0',
    );
  });

  it('should route malformed JSON immediately to DLQ and ACK from main stream', async () => {
    const malformedMessages: Array<[string, string[]]> = [
      ['1710000000001-0', ['data', '{ invalid json...']],
    ];

    mockRedis.xadd.mockResolvedValueOnce('dlq-id-1');
    mockRedis.xack.mockResolvedValueOnce(1);

    await (worker as any).processMessageBatch(malformedMessages);

    expect(mockRedis.xadd).toHaveBeenCalledWith(
      'stream:chat-messages:dlq',
      '*',
      'originalStreamId',
      '1710000000001-0',
      'payload',
      expect.any(String),
      'error',
      expect.any(String),
      'failedAt',
      expect.any(String),
    );
    expect(mockRedis.xack).toHaveBeenCalledWith(
      'stream:chat-messages',
      'chat-service-group',
      '1710000000001-0',
    );
    expect(mockPrisma.chatMessage.createMany).not.toHaveBeenCalled();
  });

  it('should fallback to individual processing and route poison pills to DLQ on batch failure', async () => {
    const goodPayload = JSON.stringify({
      id: 'good-msg-1',
      sender: 'user-1',
      roomId: 'room-1',
      text: 'Good message',
    });

    const poisonPayload = JSON.stringify({
      id: 'poison-msg-2',
      sender: 'user-2',
      roomId: 'room-1',
      text: 'Causes FK constraint failure',
    });

    const messages: Array<[string, string[]]> = [
      ['1000-1', ['data', goodPayload]],
      ['1000-2', ['data', poisonPayload]],
    ];

    mockPrisma.chatMessage.createMany.mockRejectedValueOnce(new Error('Batch insert error'));

    mockPrisma.chatMessage.upsert
      .mockResolvedValueOnce({ id: 'good-msg-1' })
      .mockRejectedValueOnce(new Error('Foreign key constraint failed on sender userId'));

    mockRedis.xack.mockResolvedValue(1);
    mockRedis.xadd.mockResolvedValue('dlq-id-2');

    await (worker as any).processMessageBatch(messages);

    expect(mockRedis.xack).toHaveBeenCalledWith(
      'stream:chat-messages',
      'chat-service-group',
      '1000-1',
    );
    expect(mockRedis.xack).toHaveBeenCalledWith(
      'stream:chat-messages',
      'chat-service-group',
      '1000-2',
    );

    expect(mockRedis.xadd).toHaveBeenCalledWith(
      'stream:chat-messages:dlq',
      '*',
      'originalStreamId',
      '1000-2',
      'payload',
      expect.stringContaining('poison-msg-2'),
      'error',
      expect.stringContaining('Foreign key constraint'),
      'failedAt',
      expect.any(String),
    );
  });
});
