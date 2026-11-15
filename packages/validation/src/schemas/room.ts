import { z } from 'zod';
import { userResponseSchema } from './user.js';
import { chatMessagePayloadSchema } from './chat.js';

const uuidSchema = (message: string) => z.string().uuid({ message });
const isoDatetimeSchema = (message: string) => z.string().datetime({ message });

export const roomTypeSchema = z.enum(['DIRECT', 'GROUP']);
export type RoomType = z.infer<typeof roomTypeSchema>;

const roomNameSchema = z
  .string({ message: 'name must be a string' })
  .trim()
  .min(1, { message: 'name is required' })
  .max(100, { message: 'name must be at most 100 characters' });

const roomDescriptionSchema = z
  .string({ message: 'description must be a string' })
  .trim()
  .max(255, { message: 'description must be at most 255 characters' });

const usernameSchema = z
  .string({ message: 'username must be a string' })
  .trim()
  .min(1, { message: 'username is required' })
  .max(50, { message: 'username must be at most 50 characters' })
  .transform((value) => value.replace(/^@+/, ''));

export const createDirectRoomSchema = z.object({
  body: z.object({
    targetUserId: uuidSchema('targetUserId must be a valid UUID'),
  }),
});

export type CreateDirectRoomInput = z.infer<typeof createDirectRoomSchema>['body'];

export const createGroupRoomSchema = z.object({
  body: z.object({
    name: roomNameSchema,
    description: roomDescriptionSchema.optional(),
    avatarUrl: z.string().nullable().optional(),
    memberUsernames: z.array(usernameSchema).default([]),
  }),
});

export type CreateGroupRoomInput = z.infer<typeof createGroupRoomSchema>['body'];

export const createRoomSchema = z.object({
  body: z.object({
    type: roomTypeSchema.default('DIRECT'),
    name: roomNameSchema.optional(),
    description: roomDescriptionSchema.optional(),
    avatarUrl: z.string().nullable().optional(),
    targetUserId: uuidSchema('targetUserId must be a valid UUID').optional(),
    memberUsernames: z.array(usernameSchema).default([]),
  }),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>['body'];

const editRoomBodySchema = z
  .object({
    name: roomNameSchema.optional(),
    description: roomDescriptionSchema.optional(),
    avatarUrl: z.string().nullable().optional(),
  })
  .superRefine((body, ctx) => {
    if (
      body.name === undefined &&
      body.description === undefined &&
      body.avatarUrl === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide at least one field to update',
      });
    }
  });

export const editRoomSchema = z.object({
  params: z.object({
    id: uuidSchema('id must be a valid UUID'),
  }),
  body: editRoomBodySchema,
});

export type EditRoomRequest = z.infer<typeof editRoomSchema>;

export const deleteRoomSchema = z.object({
  params: z.object({
    id: uuidSchema('id must be a valid UUID'),
  }),
});

export type DeleteRoomRequest = z.infer<typeof deleteRoomSchema>;

export const getRoomSchema = z.object({
  params: z.object({
    id: uuidSchema('id must be a valid UUID'),
  }),
});

export type GetRoomRequest = z.infer<typeof getRoomSchema>;

export const searchRoomsSchema = z.object({
  query: z.object({
    name: z
      .string({ message: 'name must be a string' })
      .trim()
      .max(100, { message: 'name must be at most 100 characters' })
      .optional()
      .default(''),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  }),
});

export type SearchRoomsRequest = z.infer<typeof searchRoomsSchema>;

export const addRoomMembersSchema = z.object({
  params: z.object({
    id: uuidSchema('id must be a valid UUID'),
  }),
  body: z.object({
    usernames: z
      .array(usernameSchema, { message: 'usernames must be an array' })
      .min(1, { message: 'Provide at least one username' })
      .max(100, { message: 'You can add at most 100 users at once' }),
  }),
});

export type AddRoomMembersRequest = z.infer<typeof addRoomMembersSchema>;

export const removeRoomMemberSchema = z.object({
  params: z.object({
    id: uuidSchema('id must be a valid UUID'),
    memberId: uuidSchema('memberId must be a valid UUID'),
  }),
});

export type RemoveRoomMemberRequest = z.infer<typeof removeRoomMemberSchema>;

export const updateRoomMemberRoleSchema = z.object({
  params: z.object({
    id: uuidSchema('id must be a valid UUID'),
    memberId: uuidSchema('memberId must be a valid UUID'),
  }),
  body: z.object({
    role: z.enum(['MEMBER', 'ADMIN', 'OWNER']),
  }),
});

export type UpdateRoomMemberRoleRequest = z.infer<typeof updateRoomMemberRoleSchema>;

export const leaveRoomSchema = z.object({
  params: z.object({
    id: uuidSchema('id must be a valid UUID'),
  }),
  body: z.object({
    userId: uuidSchema('userId must be a valid UUID').optional(),
  }).optional(),
});

export type LeaveRoomRequest = z.infer<typeof leaveRoomSchema>;

export const roomMemberRoleSchema = z.enum(['MEMBER', 'ADMIN', 'OWNER']);

export const roomMemberResponseSchema = z.object({
  id: uuidSchema('id must be a valid UUID'),
  roomId: uuidSchema('roomId must be a valid UUID'),
  userId: uuidSchema('userId must be a valid UUID'),
  role: roomMemberRoleSchema,
  createdAt: isoDatetimeSchema('createdAt must be a valid ISO datetime'),
  user: userResponseSchema.nullable(),
});

export type RoomMemberRecord = z.infer<typeof roomMemberResponseSchema>;

export const roomResponseSchema = z.object({
  id: uuidSchema('id must be a valid UUID'),
  type: roomTypeSchema,
  name: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  creatorId: uuidSchema('creatorId must be a valid UUID').nullable().optional(),
  createdAt: isoDatetimeSchema('createdAt must be a valid ISO datetime'),
  updatedAt: isoDatetimeSchema('updatedAt must be a valid ISO datetime'),
  creator: userResponseSchema.nullable().optional(),
  members: z.array(roomMemberResponseSchema),
  lastMessage: chatMessagePayloadSchema.nullable().optional(),
});

export type RoomRecord = z.infer<typeof roomResponseSchema>;
