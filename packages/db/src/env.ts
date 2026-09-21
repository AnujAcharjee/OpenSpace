import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 1. Load base .env from current and parent directories
let currentDir = process.cwd();
for (let i = 0; i < 4; i++) {
  const baseEnvPath = path.resolve(currentDir, '.env');
  if (fs.existsSync(baseEnvPath)) {
    dotenv.config({ path: baseEnvPath });
  }
  const parentDir = path.dirname(currentDir);
  if (parentDir === currentDir) break;
  currentDir = parentDir;
}

// 2. Override with local development files in standard precedence order
const overrideFiles = [
  '.env.development',
  '.env.local',
  '.env.development.local',
];

currentDir = process.cwd();
for (let i = 0; i < 4; i++) {
  for (const file of overrideFiles) {
    const candidatePath = path.resolve(currentDir, file);
    if (fs.existsSync(candidatePath)) {
      dotenv.config({ path: candidatePath, override: true });
    }
  }
  const parentDir = path.dirname(currentDir);
  if (parentDir === currentDir) break;
  currentDir = parentDir;
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
