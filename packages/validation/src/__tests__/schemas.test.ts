import { describe, it, expect } from 'vitest';
import {
  searchRoomsSchema,
  createRoomSchema,
  createMessageSchema,
  wsMessageSchema,
  requestJoinRoomSchema,
  respondJoinRequestSchema,
} from '../index.js';

const VALID_UUID_1 = 'a0000000-0000-0000-0000-000000000001';
const VALID_UUID_2 = 'b0000000-0000-0000-0000-000000000002';
const VALID_UUID_3 = 'c0000000-0000-0000-0000-000000000003';

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

  describe('createRoomSchema', () => {
    it('should validate valid room creation body', () => {
      const result = createRoomSchema.safeParse({
        body: {
          name: 'Engineering',
          description: 'Engineering discussions',
          creatorId: VALID_UUID_1,
          isPrivate: false,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing or empty room name', () => {
      const result = createRoomSchema.safeParse({
        body: {
          name: '',
          creatorId: VALID_UUID_1,
          isPrivate: false,
        },
      });
      expect(result.success).toBe(false);
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

  describe('requestJoinRoomSchema & respondJoinRequestSchema', () => {
    it('should validate requestJoinRoom body and params with valid UUIDs', () => {
      const result = requestJoinRoomSchema.safeParse({
        params: { id: VALID_UUID_1 },
        body: { userId: VALID_UUID_2 },
      });
      expect(result.success).toBe(true);
    });

    it('should validate respondJoinRequest body and params with valid UUIDs', () => {
      const result = respondJoinRequestSchema.safeParse({
        params: { id: VALID_UUID_1, requestId: VALID_UUID_2 },
        body: { actorUserId: VALID_UUID_3, approve: true },
      });
      expect(result.success).toBe(true);
    });
  });
});
