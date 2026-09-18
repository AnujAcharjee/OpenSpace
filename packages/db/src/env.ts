import 'dotenv/config';

export interface DbEnv {
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  isDev: boolean;
  isProd: boolean;
}

function validateAndGetDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[@repo/db] Missing required environment variable: DATABASE_URL. Please set DATABASE_URL in your environment or .env file.',
      );
    }

    return 'postgresql://postgres:postgres@localhost:5432/collab';
  }

  return url;
}

function getNodeEnv(): 'development' | 'production' | 'test' {
  const envValue = process.env.NODE_ENV?.trim();
  if (envValue === 'production' || envValue === 'test') {
    return envValue;
  }
  return 'development';
}

const currentEnv = getNodeEnv();

export const env: DbEnv = {
  DATABASE_URL: validateAndGetDatabaseUrl(),
  NODE_ENV: currentEnv,
  isDev: currentEnv === 'development',
  isProd: currentEnv === 'production',
};

export default env;
