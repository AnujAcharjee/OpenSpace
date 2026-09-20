import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Helper to load env candidates
const envCandidateFiles = [
  '.env.development.local',
  '.env.local',
  '.env.development',
  '.env',
];

for (const file of envCandidateFiles) {
  const localEnvPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  }
}

// 2. If DATABASE_URL is not set, attempt to load from parent monorepo directories
if (!process.env.DATABASE_URL) {
  let currentDir = process.cwd();
  for (let i = 0; i < 4; i++) {
    for (const file of envCandidateFiles) {
      const candidatePath = path.resolve(currentDir, file);
      if (fs.existsSync(candidatePath)) {
        dotenv.config({ path: candidatePath });
        if (process.env.DATABASE_URL) break;
      }
    }
    if (process.env.DATABASE_URL) break;
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
