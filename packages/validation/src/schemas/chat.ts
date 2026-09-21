import { z } from 'zod';

const uuidSchema = (message: string) => z.string().uuid(message);
const isoDatetimeSchema = (message: string) => z.string().datetime({ message });
const messageTypeSchema = z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']);

const charMessageBaseSchema = z.object({
  sender: z.string({ message: 'Sender must be a string' }),
  text: z
    .string({ message: 'Message text must be a string' })
    .min(1, { message: 'Message text must be at least 1 character' })
    .max(500, { message: 'Message text must be at most 500 characters' })
    .optional(), // for attachments-only messages
  attachments: z.string({ message: 'Attachments must be a string' }).optional(), // JSON string
  roomId: z.string({ message: 'Room id must be a string' }),
  parentId: uuidSchema('Parent id must be a valid uuid').optional(),
  senderUsername: z.string().optional(),
  senderAvatarUrl: z.string().nullable().optional(),
  type: messageTypeSchema.optional(),
  parent: z
    .object({
      id: z.string(),
      text: z.string().optional(),
      senderUsername: z.string().optional(),
      isDeleted: z.boolean().optional(),
    })
    .optional(),
});

const messageContentSchema = charMessageBaseSchema.superRefine((body, ctx) => {
  if (body.text === undefined && body.attachments === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either text or attachments must be provided',
    });
  }
});

const createMessageBodySchema = charMessageBaseSchema
  .partial({ sender: true })
  .extend({
    type: messageTypeSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.text === undefined && body.attachments === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either text or attachments must be provided',
      });
    }
  });

export const chatMessageSchema = z.object({
  body: messageContentSchema,
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatMessagePayloadSchema = charMessageBaseSchema.extend({
  id: uuidSchema('Message id must be a valid uuid'),
  createdAt: isoDatetimeSchema('Created at must be a valid ISO datetime'),
});

export type ChatMessagePayload = z.infer<typeof chatMessagePayloadSchema>;

export const chatMessagePayloadAndReceiversSchema = chatMessagePayloadSchema.extend({
  receivers: z
    .array(z.string(), { message: 'Receivers must be an array of strings' })
    .min(1, { message: 'At least one receiver is required' }),
});

export type ChatMessagePayloadAndReceivers = z.infer<typeof chatMessagePayloadAndReceiversSchema>;

export const createMessageSchema = z.object({
  body: createMessageBodySchema,
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const editMessageTextSchema = z.object({
  params: z.object({
    id: uuidSchema('Message id must be a valid uuid'),
  }),
  body: z.object({
    text: z
      .string({ message: 'Message text must be a string' })
      .trim()
      .min(1, { message: 'Message text must be at least 1 character' })
      .max(500, { message: 'Message text must be at most 500 characters' }),
  }),
});

export type EditMessageTextInput = z.infer<typeof editMessageTextSchema>;

export const deleteMessageSchema = z.object({
  params: z.object({
    id: uuidSchema('Message id must be a valid uuid'),
  }),
});

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

export const getRoomMessagesSchema = z.object({
  params: z.object({
    roomId: uuidSchema('Room id must be a valid uuid'),
  }),
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export type GetRoomMessagesInput = z.infer<typeof getRoomMessagesSchema>;
