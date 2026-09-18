import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 1. Load from current working directory
dotenv.config();

// 2. If DATABASE_URL is not set, attempt to load from parent monorepo directories
if (!process.env.DATABASE_URL) {
  let currentDir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const parentEnvPath = path.resolve(currentDir, '.env');
    if (fs.existsSync(parentEnvPath)) {
      dotenv.config({ path: parentEnvPath });
      if (process.env.DATABASE_URL) break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
}

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
