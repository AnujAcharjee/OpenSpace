import { Router } from 'express';
import {
  addRoomMembersSchema,
  createDirectRoomSchema,
  createGroupRoomSchema,
  createRoomSchema,
  deleteRoomSchema,
  editRoomSchema,
  getRoomSchema,
  leaveRoomSchema,
  removeRoomMemberSchema,
  updateRoomMemberRoleSchema,
  searchRoomsSchema,
} from '@repo/validation';
import { addRoomMembers } from '../controllers/room/addRoomMembers.js';
import { createDirectRoom } from '../controllers/room/createDirectRoom.js';
import { createGroupRoom } from '../controllers/room/createGroupRoom.js';
import { createRoom } from '../controllers/room/createRoom.js';
import { deleteRoom } from '../controllers/room/deleteRoom.js';
import { editRoom } from '../controllers/room/editRoom.js';
import { getRoom } from '../controllers/room/getRoom.js';
import { leaveRoom } from '../controllers/room/leaveRoom.js';
import { removeRoomMember } from '../controllers/room/removeRoomMember.js';
import { updateRoomMemberRole } from '../controllers/room/updateRoomMemberRole.js';
import { searchRooms } from '../controllers/room/searchRooms.js';
import { validateRequest } from '../middleware/validation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const roomRouter: Router = Router();

// Room Creation (Direct 1-to-1 & Group)
roomRouter.post('/direct', validateRequest(createDirectRoomSchema), asyncHandler(createDirectRoom));
roomRouter.post('/group', validateRequest(createGroupRoomSchema), asyncHandler(createGroupRoom));
roomRouter.post('/', validateRequest(createRoomSchema), asyncHandler(createRoom));

// Discovery & Details
roomRouter.get('/search', validateRequest(searchRoomsSchema), asyncHandler(searchRooms));
roomRouter.get('/:id', validateRequest(getRoomSchema), asyncHandler(getRoom));

// Membership & Management
roomRouter.post('/:id/leave', validateRequest(leaveRoomSchema), asyncHandler(leaveRoom));
roomRouter.post('/:id/members', validateRequest(addRoomMembersSchema), asyncHandler(addRoomMembers));
roomRouter.patch(
  '/:id/members/:memberId',
  validateRequest(updateRoomMemberRoleSchema),
  asyncHandler(updateRoomMemberRole),
);
roomRouter.patch(
  '/:id/members/:memberId/role',
  validateRequest(updateRoomMemberRoleSchema),
  asyncHandler(updateRoomMemberRole),
);
roomRouter.delete(
  '/:id/members/:memberId',
  validateRequest(removeRoomMemberSchema),
  asyncHandler(removeRoomMember),
);
roomRouter.patch('/:id', validateRequest(editRoomSchema), asyncHandler(editRoom));
roomRouter.delete('/:id', validateRequest(deleteRoomSchema), asyncHandler(deleteRoom));
