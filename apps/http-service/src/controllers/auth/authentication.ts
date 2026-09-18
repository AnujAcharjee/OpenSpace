import type { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma, Prisma } from '@repo/db';
import { auth, type ProviderProfile } from '../../lib/auth.js';
import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import { toUserRecord } from '../@helpers.js';

const PRAMAAN_SERVER_URL = process.env.PRAMAAN_SERVER_URL ?? 'https://pramaan.anujacharjee.com';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? `http://localhost:3005`;
const WEB_APP_URL = process.env.WEB_APP_URL ?? 'http://localhost:3000';
const CLIENT_ID =
  process.env.PRAMAAN_CLIENT_ID ??
  (() => {
    throw new Error('PRAMAAN_CLIENT_ID is not set');
  })();
const CLIENT_SECRET =
  process.env.PRAMAAN_SECRET ??
  (() => {
    throw new Error('PRAMAAN_SECRET is not set');
  })();
const CALLBACK_URL =
  process.env.CALLBACK_URL ?? `${API_GATEWAY_URL}/api/v1/auth/pramaan/callback`;
const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME?.trim() || 'accessToken';
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

type AuthMode = 'signin' | 'signup';

type StoredOAuthState = {
  state: string;
  nonce: string;
  codeVerifier: string;
  mode: AuthMode;
};

type TokenExchangeResponse = {
  accessToken?: string;
  idToken?: string;
};

type RawTokenApiResponse = {
  success: boolean;
  message?: string;
  data: TokenExchangeResponse;
};

type NormalizedTokenExchangeResponse = {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  refreshToken?: string;
  idToken?: string;
  scope?: string;
};

type RawApiResponse = {
  success: boolean;
  message?: string;
  data: ProviderProfile;
};

function buildAuthorizationUrl(state: string, nonce: string, codeChallenge: string): string {
  const authUrl = new URL(`${PRAMAAN_SERVER_URL}/api/oauth/authorize`);

  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return authUrl.toString();
}

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenExchangeResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: CALLBACK_URL,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${PRAMAAN_SERVER_URL}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error('Token exchange failed');
  }

  const json = (await response.json()) as RawTokenApiResponse;
  return json.data;
}

function normalizeTokenResponse(tokenData: TokenExchangeResponse): NormalizedTokenExchangeResponse {
  return {
    accessToken: tokenData.accessToken,
    idToken: tokenData.idToken,
  };
}

function getSingleQueryParam(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function generateVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateNonce(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateOAuthParameters(mode: AuthMode): StoredOAuthState & { codeChallenge: string } {
  const codeVerifier = generateVerifier();

  return {
    state: generateState(),
    nonce: generateNonce(),
    codeVerifier,
    codeChallenge: generateChallenge(codeVerifier),
    mode,
  };
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

async function fetchInfo(providerUserId: string, accessToken: string): Promise<ProviderProfile> {
  const response = await fetch(`${PRAMAAN_SERVER_URL}/api/oauth/account/${providerUserId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Pramaan profile for ${providerUserId}`);
  }

  const json = (await response.json()) as RawApiResponse;
  return json.data;
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

async function loadStoredOAuthState(state: string): Promise<StoredOAuthState | null> {
  const rawState = await redis.get(getStateRedisKey(state));
  if (!rawState) return null;

  try {
    return JSON.parse(rawState) as StoredOAuthState;
  } catch {
    return null;
  }
}

export const authentication = async (req: Request, res: Response) => {  
  const mode = parseAuthMode(getSingleQueryParam(req.query.mode));
  const oauthParameters = generateOAuthParameters(mode);
  const authorizationUrl = buildAuthorizationUrl(
    oauthParameters.state,
    oauthParameters.nonce,
    oauthParameters.codeChallenge,
  );

  logger.debug("Authentication got invoked")

  await redis.set(
    getStateRedisKey(oauthParameters.state),
    JSON.stringify({
      state: oauthParameters.state,
      nonce: oauthParameters.nonce,
      codeVerifier: oauthParameters.codeVerifier,
      mode,
    } satisfies StoredOAuthState),
    'EX',
    OAUTH_STATE_TTL_SECONDS,
  );

  logger.debug({mode, authorizationUrl}, "Redirecting user to Pramaan for authentication")

  return res.redirect(authorizationUrl);
};

export const oauthCallBack = async (req: Request, res: Response) => {
  const code = getSingleQueryParam(req.query.code);
  const state = getSingleQueryParam(req.query.state);
  const providerError = getSingleQueryParam(req.query.error);
  const providerErrorDescription = getSingleQueryParam(req.query.error_description);
  const fallbackMode = parseAuthMode(getSingleQueryParam(req.query.mode));

  logger.debug({ code: Boolean(code), state: Boolean(state), providerError }, "OAuth callback got invoked");

  if (!state) {
    return res.redirect(buildWebAuthUrl(fallbackMode, 'Missing state parameter'));
  }

  const oauthState = await loadStoredOAuthState(state);
  const mode = oauthState?.mode ?? fallbackMode;

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

  logger.debug({ providerUserId: Boolean(oauthState.nonce) }, "Exchanging authorization code for tokens with Pramaan");

  try {
    const rawTokenData = await exchangeCodeForTokens(code, oauthState.codeVerifier);
    const tokenData = normalizeTokenResponse(rawTokenData);

    logger.debug({ hasIdToken: Boolean(tokenData.idToken), hasAccessToken: Boolean(tokenData.accessToken) }, "Received token response from Pramaan");

    if (!tokenData.idToken) {
      return res.redirect(buildWebAuthUrl(mode, 'Pramaan did not return an ID token'));
    }

    const payload = await auth.verifyIdToken(tokenData.idToken, oauthState.nonce);
    const providerUserId = typeof payload.sub === 'string' ? payload.sub : String(payload.sub);

    let providerProfile: ProviderProfile = payload;

    logger.debug({ providerUserId, hasAccessToken: Boolean(tokenData.accessToken) }, "Fetching user profile from Pramaan");

    if (tokenData.accessToken) {
      try {
        providerProfile = await fetchInfo(providerUserId, tokenData.accessToken);
      } catch (error) {
        logger.warn(
          { err: error, providerUserId },
          'Failed to fetch Pramaan userinfo, falling back to ID token claims',
        );
      }
    }

    const user = await ensureUserFromProfile(providerProfile);
    const accessToken = await auth.issueAccessToken(user);

    logger.debug({ userId: user.id, accessTokenIssued: Boolean(accessToken) }, "Successfully authenticated user and issued access token");

    res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
      path: '/',
    });

    logger.debug("Redirecting user to web application after successful authentication");

    return res.redirect(`${WEB_APP_URL}`);
  } catch (error) {
    logger.error({ err: error, state }, 'Pramaan OAuth callback failed');
    return res.redirect(buildWebAuthUrl(mode, 'Authentication failed. Please try again.'));
  }
};
