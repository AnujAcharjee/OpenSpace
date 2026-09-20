import { AuthService } from '@repo/auth';

export * from '@repo/auth';

export const auth = new AuthService({
  jwtSecret: process.env.JWT_SECRET!,
  accessTokenCookieName: process.env.ACCESS_TOKEN_COOKIE_NAME,
  oidc: {
    jwksUrl: `${process.env.PRAMAAN_SERVER_URL}/api/.well-known/jwks.json`,
    issuer: process.env.PRAMAAN_SERVER_URL!,
    clientId: process.env.PRAMAAN_CLIENT_ID!,
  },
});
