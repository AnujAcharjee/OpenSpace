import { Router } from 'express';
import {
  createUserSchema,
  deleteUserSchema,
  editUserSchema,
  getUserSchema,
  hydrateUserSchema,
  issueTicketSchema,
} from '@repo/validation';
import { createUser } from '../controllers/user/createUser.js';
import { deleteUser } from '../controllers/user/deleteUser.js';
import { editUser } from '../controllers/user/editUser.js';
import { getUser } from '../controllers/user/getUser.js';
import { hydrateUser } from '../controllers/user/hydrateUser.js';
import { issueTicket } from '../controllers/user/issueTicket.js';
import { searchUsers } from '../controllers/user/searchUsers.js';
import { validateRequest } from '../middleware/validation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const userRouter: Router = Router();


userRouter.get('/hydrate', asyncHandler(hydrateUser));
userRouter.get('/search', asyncHandler(searchUsers));
userRouter.get('/', validateRequest(getUserSchema), asyncHandler(getUser));
userRouter.post('/', validateRequest(createUserSchema), asyncHandler(createUser));
userRouter.get('/:id', validateRequest(getUserSchema), asyncHandler(getUser));
userRouter.patch('/:id', validateRequest(editUserSchema), asyncHandler(editUser));
userRouter.delete('/:id', validateRequest(deleteUserSchema), asyncHandler(deleteUser));

userRouter.post('/ws-ticket', validateRequest(issueTicketSchema), asyncHandler(issueTicket));
