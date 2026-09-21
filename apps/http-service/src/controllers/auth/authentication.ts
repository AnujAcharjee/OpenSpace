import type { Request, Response } from 'express';
import crypto from 'crypto';
import type { AuthorizationTransaction } from '@anuj304/pramaan';
import { prisma, Prisma } from '@repo/db';
import { auth, type ProviderProfile } from '../../lib/auth.js';
import { pramaan } from '../../lib/pramaan.js';
import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import { toUserRecord } from '../@helpers.js';
import { getAuthCookieOptions, getClearAuthCookieOptions } from '../../utils/cookie.js';

const WEB_APP_URL = process.env.WEB_APP_URL ?? 'http://localhost:3000';
const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME?.trim() || 'accessToken';
const PRAMAAN_TX_COOKIE_NAME = 'pramaan_tx';
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

type AuthMode = 'signin' | 'signup';

type StoredOAuthTransaction = AuthorizationTransaction & {
  mode: AuthMode;
};

function getSingleQueryParam(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseAuthMode(value: unknown): AuthMode {
  return value === 'signup' ? 'signup' : 'signin';
}

function getStringClaim(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeUsername(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return normalized || `user-${crypto.randomUUID().slice(0, 8)}`;
}

function buildUsernameCandidates(payload: ProviderProfile, email: string): string[] {
  const emailLocalPart = email.split('@')[0] ?? 'user';
  const fullName = getStringClaim(payload.name);
  const preferredUsername = getStringClaim(payload.preferred_username);
  const givenName = getStringClaim(payload.given_name);
  const familyName = getStringClaim(payload.family_name);

  return [
    ...new Set(
      [preferredUsername, fullName, [givenName, familyName].filter(Boolean).join('-'), emailLocalPart]
        .filter((value): value is string => Boolean(value))
        .map(normalizeUsername),
    ),
  ];
}

async function fetchUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  return user ? toUserRecord(user) : null;
}

async function createUserProfile(input: {
  email: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}) {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: input.email.toLowerCase(),
      username: input.username,
      name: input.name ?? null,
      avatarUrl: input.avatarUrl ?? null,
      updatedAt: new Date(),
    },
  });

  return toUserRecord(user);
}

async function ensureUserFromProfile(payload: ProviderProfile) {
  const email = getStringClaim(payload.email)?.toLowerCase();

  if (!email) {
    throw new Error('Pramaan did not return an email address');
  }

  const existingUser = await fetchUserByEmail(email);
  if (existingUser) return existingUser;

  const name = getStringClaim(payload.name) ?? undefined;
  const avatarUrl = getStringClaim(payload.picture) ?? undefined;
  const usernameCandidates = buildUsernameCandidates(payload, email);

  for (let index = 0; index < usernameCandidates.length + 5; index += 1) {
    const baseUsername = usernameCandidates[index] ?? usernameCandidates[0] ?? normalizeUsername(email);
    const username =
      index < usernameCandidates.length ?
        baseUsername
        : normalizeUsername(`${baseUsername}-${crypto.randomUUID().slice(0, 8)}`);

    try {
      return await createUserProfile({ email, username, name, avatarUrl });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        continue;
      }
      throw error;
    }
  }

  const userAfterConflict = await fetchUserByEmail(email);
  if (userAfterConflict) return userAfterConflict;

  throw new Error('Unable to create a local user profile');
}

function buildWebAuthUrl(mode: AuthMode, error?: string) {
  const url = new URL('/auth', WEB_APP_URL);
  url.searchParams.set('mode', mode);
  if (error) url.searchParams.set('error', error);
  return url.toString();
}

function getStateRedisKey(state: string) {
  return `oauth:pramaan:${state}`;
}

async function loadStoredOAuthTransaction(
  state: string,
  cookieTx?: string,
): Promise<StoredOAuthTransaction | null> {
  // 1. Try from cookie first
  if (cookieTx) {
    try {
      const parsed = JSON.parse(cookieTx) as StoredOAuthTransaction;
      if (parsed?.state === state) {
        return parsed;
      }
    } catch {
      // ignore JSON parse error, fall back to redis
    }
  }

  // 2. Fall back to Redis
  const rawState = await redis.get(getStateRedisKey(state));
  if (!rawState) return null;

  try {
    return JSON.parse(rawState) as StoredOAuthTransaction;
  } catch {
    return null;
  }
}

export const authentication = async (req: Request, res: Response) => {
  const mode = parseAuthMode(getSingleQueryParam(req.query.mode));
  
  // 1. Generate authorization request with official SDK
  const authReq = await pramaan.createAuthorizationRequest({
    scope: ['openid', 'profile', 'email'],
  });

  const txData: StoredOAuthTransaction = {
    ...authReq.transaction,
    mode,
  };

  logger.debug({ mode, state: authReq.transaction.state }, 'Initiating Pramaan authentication');

  // 2. Set temporary httpOnly cookie for JWT stateless flow
  res.cookie(
    PRAMAAN_TX_COOKIE_NAME,
    JSON.stringify(txData),
    getAuthCookieOptions(OAUTH_STATE_TTL_SECONDS),
  );

  // 3. Also store in Redis for resilience
  await redis.set(
    getStateRedisKey(authReq.transaction.state),
    JSON.stringify(txData),
    'EX',
    OAUTH_STATE_TTL_SECONDS,
  );

  return res.redirect(authReq.url);
};

export const oauthCallBack = async (req: Request, res: Response) => {
  const code = getSingleQueryParam(req.query.code);
  const state = getSingleQueryParam(req.query.state);
  const providerError = getSingleQueryParam(req.query.error);
  const providerErrorDescription = getSingleQueryParam(req.query.error_description);
  const fallbackMode = parseAuthMode(getSingleQueryParam(req.query.mode));

  logger.debug({ hasCode: Boolean(code), hasState: Boolean(state), providerError }, 'Pramaan OAuth callback received');

  if (!state) {
    return res.redirect(buildWebAuthUrl(fallbackMode, 'Missing state parameter'));
  }

  const cookieTx = typeof req.cookies?.[PRAMAAN_TX_COOKIE_NAME] === 'string' ? req.cookies[PRAMAAN_TX_COOKIE_NAME] : undefined;
  const oauthState = await loadStoredOAuthTransaction(state, cookieTx);
  const mode = oauthState?.mode ?? fallbackMode;

  // Clear temporary transaction states
  res.clearCookie(PRAMAAN_TX_COOKIE_NAME, getClearAuthCookieOptions());
  await redis.del(getStateRedisKey(state));

  if (providerError) {
    return res.redirect(buildWebAuthUrl(mode, providerErrorDescription ?? providerError));
  }

  if (!oauthState || oauthState.state !== state) {
    return res.redirect(buildWebAuthUrl(mode, 'Your sign-in session expired. Please try again.'));
  }

  if (!code) {
    return res.redirect(buildWebAuthUrl(mode, 'Missing authorization code'));
  }

  try {
    // 4. Handle callback using @anuj304/pramaan SDK
    const tokens = await pramaan.handleCallback({
      code,
      state,
      transaction: oauthState,
      error: providerError ?? undefined,
      errorDescription: providerErrorDescription ?? undefined,
    });

    logger.debug({ hasIdToken: Boolean(tokens.idToken), hasAccessToken: Boolean(tokens.accessToken) }, 'Pramaan tokens received');

    let providerProfile: ProviderProfile = {};

    if (tokens.idToken) {
      try {
        const idClaims = await auth.verifyIdToken(tokens.idToken, oauthState.nonce);
        providerProfile = { ...idClaims };
      } catch (idErr) {
        logger.warn({ err: idErr }, 'Could not verify ID token with local JWKS, relying on SDK validated tokens');
      }
    }

    // 5. Retrieve complete user info claims if access token is present
    if (tokens.accessToken) {
      try {
        const userInfo = await pramaan.getUserInfo(tokens.accessToken);
        providerProfile = {
          ...providerProfile,
          ...(userInfo as unknown as ProviderProfile),
        };
      } catch (error) {
        logger.warn({ err: error }, 'Failed to fetch Pramaan userInfo endpoint, falling back to ID token claims');
      }
    }

    // 6. Match or create user record in Postgres
    const user = await ensureUserFromProfile(providerProfile);

    // 7. Issue application JWT access token
    const accessToken = await auth.issueAccessToken(user);

    // 8. Set application JWT in secure httpOnly cookie (shared with web app domain)
    res.cookie(
      ACCESS_TOKEN_COOKIE_NAME,
      accessToken,
      getAuthCookieOptions(ACCESS_TOKEN_TTL_SECONDS),
    );

    logger.info({ userId: user.id, username: user.username }, 'User successfully authenticated via Pramaan SDK');
    const redirectUrl = new URL(`/@${encodeURIComponent(user.username)}`, WEB_APP_URL).toString();
    return res.redirect(redirectUrl);
  } catch (error) {
    logger.error({ err: error, state }, 'Pramaan SDK callback processing failed');
    return res.redirect(buildWebAuthUrl(mode, 'Authentication failed. Please try again.'));
  }
};
