import { Router } from 'express';
import {
  addRoomMembersSchema,
  createRoomSchema,
  deleteRoomSchema,
  editRoomSchema,
  getPendingJoinRequestsSchema,
  getRoomSchema,
  leaveRoomSchema,
  removeRoomMemberSchema,
  requestJoinRoomSchema,
  respondJoinRequestSchema,
  searchRoomsSchema,
} from '@repo/validation';
import { addRoomMembers } from '../controllers/room/addRoomMembers.js';
import { createRoom } from '../controllers/room/createRoom.js';
import { deleteRoom } from '../controllers/room/deleteRoom.js';
import { editRoom } from '../controllers/room/editRoom.js';
import { getRoom } from '../controllers/room/getRoom.js';
import { leaveRoom } from '../controllers/room/leaveRoom.js';
import { removeRoomMember } from '../controllers/room/removeRoomMember.js';
import { requestJoinRoomController } from '../controllers/room/requestJoinRoom.js';
import { getPendingJoinRequestsController } from '../controllers/room/getPendingJoinRequests.js';
import { respondJoinRequestController } from '../controllers/room/respondJoinRequest.js';
import { searchRooms } from '../controllers/room/searchRooms.js';
import { validateRequest } from '../middleware/validation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const roomRouter: Router = Router();

roomRouter.post('/', validateRequest(createRoomSchema), asyncHandler(createRoom));
roomRouter.get('/search', validateRequest(searchRoomsSchema), asyncHandler(searchRooms));
roomRouter.post('/:id/join', validateRequest(requestJoinRoomSchema), asyncHandler(requestJoinRoomController));
roomRouter.post('/:id/leave', validateRequest(leaveRoomSchema), asyncHandler(leaveRoom));
roomRouter.get(
  '/:id/join-requests',
  validateRequest(getPendingJoinRequestsSchema),
  asyncHandler(getPendingJoinRequestsController),
);
roomRouter.post(
  '/:id/join-requests/:requestId/respond',
  validateRequest(respondJoinRequestSchema),
  asyncHandler(respondJoinRequestController),
);
roomRouter.get('/:id', validateRequest(getRoomSchema), asyncHandler(getRoom));
roomRouter.post('/:id/members', validateRequest(addRoomMembersSchema), asyncHandler(addRoomMembers));
roomRouter.delete(
  '/:id/members/:memberId',
  validateRequest(removeRoomMemberSchema),
  asyncHandler(removeRoomMember),
);
roomRouter.patch('/:id', validateRequest(editRoomSchema), asyncHandler(editRoom));
roomRouter.delete('/:id', validateRequest(deleteRoomSchema), asyncHandler(deleteRoom));
