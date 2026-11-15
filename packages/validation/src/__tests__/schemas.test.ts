import { describe, it, expect } from 'vitest';
import {
  searchRoomsSchema,
  createRoomSchema,
  createDirectRoomSchema,
  createGroupRoomSchema,
  createMessageSchema,
  wsMessageSchema,
} from '../index.js';

const VALID_UUID_1 = 'a0000000-0000-0000-0000-000000000001';
const VALID_UUID_2 = 'b0000000-0000-0000-0000-000000000002';

describe('Validation Schemas', () => {
  describe('searchRoomsSchema', () => {
    it('should parse an empty query object and provide default empty string', () => {
      const result = searchRoomsSchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.name).toBe('');
      }
    });

    it('should parse an empty string query name', () => {
      const result = searchRoomsSchema.safeParse({ query: { name: '' } });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.name).toBe('');
      }
    });

    it('should parse a non-empty query name', () => {
      const result = searchRoomsSchema.safeParse({ query: { name: 'general' } });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.name).toBe('general');
      }
    });
  });

  describe('createDirectRoomSchema & createGroupRoomSchema', () => {
    it('should validate direct room creation body', () => {
      const result = createDirectRoomSchema.safeParse({
        body: {
          targetUserId: VALID_UUID_1,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for direct room targetUserId', () => {
      const result = createDirectRoomSchema.safeParse({
        body: {
          targetUserId: 'not-a-uuid',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should validate group room creation body', () => {
      const result = createGroupRoomSchema.safeParse({
        body: {
          name: 'Engineering Team',
          description: 'Team discussions',
          memberUsernames: ['alice', 'bob'],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty group room name', () => {
      const result = createGroupRoomSchema.safeParse({
        body: {
          name: '',
          memberUsernames: [],
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createRoomSchema', () => {
    it('should validate valid room creation body', () => {
      const result = createRoomSchema.safeParse({
        body: {
          name: 'Engineering',
          description: 'Engineering discussions',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createMessageSchema', () => {
    it('should validate valid message creation body', () => {
      const result = createMessageSchema.safeParse({
        body: {
          sender: 'user-123',
          roomId: 'room-456',
          text: 'Hello world',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should allow message with parentId (reply)', () => {
      const result = createMessageSchema.safeParse({
        body: {
          sender: 'user-123',
          roomId: 'room-456',
          text: 'Replying to comment',
          parentId: VALID_UUID_1,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject message missing sender or roomId', () => {
      const result = createMessageSchema.safeParse({
        body: {
          text: 'Hello world',
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('wsMessageSchema', () => {
    it('should validate chat message payload', () => {
      const result = wsMessageSchema.safeParse({
        type: 'chat_message',
        payload: {
          id: VALID_UUID_1,
          sender: 'user-1',
          roomId: 'room-1',
          text: 'test',
          createdAt: new Date().toISOString(),
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate notification payload', () => {
      const result = wsMessageSchema.safeParse({
        type: 'notification',
        payload: {
          title: 'Alert',
          body: 'You have a new message',
          timestamp: Date.now(),
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
