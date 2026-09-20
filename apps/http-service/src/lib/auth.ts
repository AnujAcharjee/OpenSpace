import { AuthService } from '@repo/auth';

export * from '@repo/auth';

const serverUrl = process.env.PRAMAAN_SERVER_URL || 'https://pramaan.anujacharjee.com';

export const auth = new AuthService({
  jwtSecret: process.env.JWT_SECRET!,
  accessTokenCookieName: process.env.ACCESS_TOKEN_COOKIE_NAME,
  oidc: {
    jwksUrl: `${serverUrl}/api/.well-known/jwks.json`,
    issuer: serverUrl,
    clientId: process.env.PRAMAAN_CLIENT_ID!,
  },
});
  