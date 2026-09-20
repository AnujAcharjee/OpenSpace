import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSubscriber, mockRedis, mockPrisma } = vi.hoisted(() => ({
  mockSubscriber: {
    subscribe: vi.fn().mockResolvedValue(1),
    unsubscribe: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  },
  mockRedis: {
    smembers: vi.fn().mockResolvedValue([]),
  },
  mockPrisma: {
    chatRoomMember: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('../redis.js', () => ({
  redisSub: mockSubscriber,
  redis: mockRedis,
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@repo/db', () => ({
  prisma: mockPrisma,
}));

import { SubscriptionManager } from '../subscriptionManager.js';
import type { AppWebSocket } from '../types/wss.js';

const VALID_ROOM_ID = 'a0000000-0000-0000-0000-000000000001';
const VALID_USER_ID_1 = 'b0000000-0000-0000-0000-000000000001';
const VALID_USER_ID_2 = 'b0000000-0000-0000-0000-000000000002';
const VALID_USER_ID_3 = 'b0000000-0000-0000-0000-000000000003';
const VALID_MSG_ID = 'c0000000-0000-0000-0000-000000000001';

function createMockSocket(sessionId: string, userId: string, username: string): AppWebSocket {
  return {
    sessionId,
    user: { id: userId, username, email: `${username}@example.com`, avatarUrl: null },
    isAlive: true,
    readyState: 1, // WebSocket.OPEN
    send: vi.fn(),
    terminate: vi.fn(),
    ping: vi.fn(),
  } as unknown as AppWebSocket;
}

describe('WebSocket Service - SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SubscriptionManager();
  });

  it('should subscribe to Redis room channel when the first client joins the room', async () => {
    const socket = createMockSocket('session-1', VALID_USER_ID_1, 'alice');

    await manager.registerClient(socket);
    await manager.joinRoom(socket, VALID_ROOM_ID);

    expect(mockSubscriber.subscribe).toHaveBeenCalledWith(`room:${VALID_ROOM_ID}`);
  });

  it('should not re-subscribe to Redis room channel if another client on the same node joins', async () => {
    const socket1 = createMockSocket('session-1', VALID_USER_ID_1, 'alice');
    const socket2 = createMockSocket('session-2', VALID_USER_ID_2, 'bob');

    await manager.registerClient(socket1);
    await manager.registerClient(socket2);

    await manager.joinRoom(socket1, VALID_ROOM_ID);
    expect(mockSubscriber.subscribe).toHaveBeenCalledWith(`room:${VALID_ROOM_ID}`);

    const callCountAfterFirst = mockSubscriber.subscribe.mock.calls.filter(
      (call: any[]) => call[0] === `room:${VALID_ROOM_ID}`,
    ).length;
    expect(callCountAfterFirst).toBe(1);

    await manager.joinRoom(socket2, VALID_ROOM_ID);

    const callCountAfterSecond = mockSubscriber.subscribe.mock.calls.filter(
      (call: any[]) => call[0] === `room:${VALID_ROOM_ID}`,
    ).length;
    expect(callCountAfterSecond).toBe(1);
  });

  it('should unsubscribe from Redis room channel only when the last client leaves the room', async () => {
    const socket1 = createMockSocket('session-1', VALID_USER_ID_1, 'alice');
    const socket2 = createMockSocket('session-2', VALID_USER_ID_2, 'bob');

    await manager.registerClient(socket1);
    await manager.registerClient(socket2);

    await manager.joinRoom(socket1, VALID_ROOM_ID);
    await manager.joinRoom(socket2, VALID_ROOM_ID);

    await manager.leaveRoom(socket1, VALID_ROOM_ID);
    expect(mockSubscriber.unsubscribe).not.toHaveBeenCalledWith(`room:${VALID_ROOM_ID}`);

    await manager.leaveRoom(socket2, VALID_ROOM_ID);
    expect(mockSubscriber.unsubscribe).toHaveBeenCalledWith(`room:${VALID_ROOM_ID}`);
  });

  it('should forward room messages to all local clients in that room', async () => {
    const socket1 = createMockSocket('session-1', VALID_USER_ID_1, 'alice');
    const socket2 = createMockSocket('session-2', VALID_USER_ID_2, 'bob');
    const socket3 = createMockSocket('session-3', VALID_USER_ID_3, 'charlie');

    await manager.registerClient(socket1);
    await manager.registerClient(socket2);
    await manager.registerClient(socket3);

    await manager.joinRoom(socket1, VALID_ROOM_ID);
    await manager.joinRoom(socket2, VALID_ROOM_ID);

    const testMessage = JSON.stringify({
      type: 'chat_message',
      payload: {
        id: VALID_MSG_ID,
        sender: VALID_USER_ID_1,
        roomId: VALID_ROOM_ID,
        text: 'Hello room 100',
        createdAt: new Date().toISOString(),
      },
    });

    (manager as any).handleRoomMessage(VALID_ROOM_ID, testMessage);

    expect(socket1.send).toHaveBeenCalled();
    const sentData1 = JSON.parse((socket1.send as any).mock.calls[0][0]);
    expect(sentData1.type).toBe('chat_message');
    expect(sentData1.payload.text).toBe('Hello room 100');

    expect(socket2.send).toHaveBeenCalled();
    const sentData2 = JSON.parse((socket2.send as any).mock.calls[0][0]);
    expect(sentData2.type).toBe('chat_message');
    expect(sentData2.payload.text).toBe('Hello room 100');

    expect(socket3.send).not.toHaveBeenCalled();
  });
});
