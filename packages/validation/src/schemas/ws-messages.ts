import { z } from 'zod';
import { chatMessagePayloadSchema } from './chat.js';
import { roomResponseSchema, roomJoinRequestResponseSchema } from './room.js';

export const notificationPayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
  timestamp: z.number(),
});

export const roomMemberRemovedPayloadSchema = z.object({
  roomId: z.string().uuid({ message: 'roomId must be a valid UUID' }),
  removedUserId: z.string().uuid({ message: 'removedUserId must be a valid UUID' }),
  removedUsername: z.string().trim().min(1, { message: 'removedUsername is required' }),
});

export const roomMemberRemovedPayloadAndReceiversSchema = roomMemberRemovedPayloadSchema.extend({
  receivers: z.array(z.string(), { message: 'Receivers must be an array of strings' }).min(1),
});

export const roomJoinedPayloadSchema = z.object({
  room: roomResponseSchema,
});

export const roomUpdatedPayloadSchema = z.object({
  room: roomResponseSchema,
});

export const roomDeletedPayloadSchema = z.object({
  roomId: z.string().uuid({ message: 'roomId must be a valid UUID' }),
  roomName: z.string().optional(),
});

export const roomJoinRequestedPayloadSchema = z.object({
  roomId: z.string().uuid({ message: 'roomId must be a valid UUID' }),
  request: roomJoinRequestResponseSchema,
});

export const messageDeletedPayloadSchema = z.object({
  messageId: z.string().uuid({ message: 'messageId must be a valid UUID' }),
  roomId: z.string().uuid({ message: 'roomId must be a valid UUID' }),
});

export const wsMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chat_message'),
    payload: chatMessagePayloadSchema,
  }),
  z.object({
    type: z.literal('message_deleted'),
    payload: messageDeletedPayloadSchema,
  }),
  z.object({
    type: z.literal('room_member_removed'),
    payload: roomMemberRemovedPayloadSchema,
  }),
  z.object({
    type: z.literal('notification'),
    payload: notificationPayloadSchema,
  }),
  z.object({
    type: z.literal('room_joined'),
    payload: roomJoinedPayloadSchema,
  }),
  z.object({
    type: z.literal('room_updated'),
    payload: roomUpdatedPayloadSchema,
  }),
  z.object({
    type: z.literal('room_deleted'),
    payload: roomDeletedPayloadSchema,
  }),
  z.object({
    type: z.literal('room_join_requested'),
    payload: roomJoinRequestedPayloadSchema,
  }),
]);

export type WsMessage = z.infer<typeof wsMessageSchema>;
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;
export type RoomMemberRemovedPayload = z.infer<typeof roomMemberRemovedPayloadSchema>;
export type RoomDeletedPayload = z.infer<typeof roomDeletedPayloadSchema>;
export type RoomJoinRequestedPayload = z.infer<typeof roomJoinRequestedPayloadSchema>;
export type MessageDeletedPayload = z.infer<typeof messageDeletedPayloadSchema>;
export type RoomMemberRemovedPayloadAndReceivers = z.infer<
  typeof roomMemberRemovedPayloadAndReceiversSchema
>;
