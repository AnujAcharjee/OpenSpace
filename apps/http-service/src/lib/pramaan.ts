import { PramaanClient } from '@anuj304/pramaan';

const issuer =
  process.env.PRAMAAN_SERVER_URL ||
  process.env.PRAMAAN_ISSUER ||
  'https://pramaan.anujacharjee.com';

const clientId =
  process.env.PRAMAAN_CLIENT_ID ||
  (() => {
    throw new Error('PRAMAAN_CLIENT_ID is not configured');
  })();

const clientSecret =
  process.env.PRAMAAN_CLIENT_SECRET ||
  (() => {
    throw new Error('PRAMAAN_CLIENT_SECRET is not configured');
  })();

const redirectUri =
  process.env.CALLBACK_URL ||
  process.env.PRAMAAN_REDIRECT_URI ||
  `${process.env.API_GATEWAY_URL || 'http://localhost:3005'}/api/v1/auth/pramaan/callback`;

export const pramaan = new PramaanClient({
  issuer,
  clientId,
  clientSecret,
  redirectUri,
});
