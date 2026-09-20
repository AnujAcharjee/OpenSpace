import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authentication, oauthCallBack } from '../controllers/auth/authentication.js';

export const authRouter: Router = Router();

authRouter.get('/pramaan', asyncHandler(authentication));
authRouter.get('/pramaan/callback', asyncHandler(oauthCallBack));

authRouter.post('/logout', (req, res) => {
  const cookieName = process.env.ACCESS_TOKEN_COOKIE_NAME?.trim() || 'accessToken';
  res.clearCookie(cookieName, { path: '/' });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

authRouter.get('/logout', (req, res) => {
  const cookieName = process.env.ACCESS_TOKEN_COOKIE_NAME?.trim() || 'accessToken';
  res.clearCookie(cookieName, { path: '/' });
  res.redirect(process.env.WEB_APP_URL || 'http://localhost:3000/auth');
});
