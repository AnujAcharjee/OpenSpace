import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

let isInitialized = false;

export function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  for (let i = 0; i < 6; i++) {
    if (
      fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(current, 'turbo.json'))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export interface InitEnvOptions {
  target?: 'local' | 'cloud' | string;
  force?: boolean;
}

export function initEnv(options: InitEnvOptions = {}): void {
  if (isInitialized && !options.force) {
    return;
  }

  const rootDir = findWorkspaceRoot();

  // Target precedence: explicit options.target -> process.env.ENV_TARGET -> production fallback
  const isCloudTarget =
    options.target === 'cloud' ||
    process.env.ENV_TARGET === 'cloud' ||
    process.env.NODE_ENV === 'production';

  // 1. If explicit custom ENV_FILE is given (e.g. ENV_FILE=.env.staging)
  if (process.env.ENV_FILE) {
    const customPath = path.isAbsolute(process.env.ENV_FILE)
      ? process.env.ENV_FILE
      : path.join(rootDir, process.env.ENV_FILE);
    if (fs.existsSync(customPath)) {
      dotenv.config({ path: customPath, override: true });
      isInitialized = true;
      return;
    }
  }

  // 2. Base root .env path
  const baseEnvPath = path.join(rootDir, '.env');

  if (isCloudTarget) {
    // Cloud mode (Neon DB & Upstash Redis)
    if (fs.existsSync(baseEnvPath)) {
      dotenv.config({ path: baseEnvPath, override: true });
    }
  } else {
    // Local Docker mode (default in dev: localhost:5432 & localhost:6379)
    // 2a. Load base .env first
    if (fs.existsSync(baseEnvPath)) {
      dotenv.config({ path: baseEnvPath });
    }

    // Also check app-local .env
    const localEnvPath = path.resolve(process.cwd(), '.env');
    if (localEnvPath !== baseEnvPath && fs.existsSync(localEnvPath)) {
      dotenv.config({ path: localEnvPath });
    }

    // 2b. Override with local development files
    const devFiles = [
      '.env.development',
      '.env.local',
      '.env.development.local',
    ];

    for (const file of devFiles) {
      // Root level override
      const rootDevFile = path.join(rootDir, file);
      if (fs.existsSync(rootDevFile)) {
        dotenv.config({ path: rootDevFile, override: true });
      }

      // App level override
      const appDevFile = path.resolve(process.cwd(), file);
      if (appDevFile !== rootDevFile && fs.existsSync(appDevFile)) {
        dotenv.config({ path: appDevFile, override: true });
      }
    }
  }

  isInitialized = true;
}

// Auto-initialize with default target on import
initEnv();

export function getEnv(key: string, defaultValue?: string): string {
  const val = process.env[key];
  if (val !== undefined && val !== '') {
    return val;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`[@repo/env] Missing required environment variable: ${key}`);
}

export const isDev = () => process.env.NODE_ENV !== 'production';
export const isProd = () => process.env.NODE_ENV === 'production';
export const isCloud = () => process.env.ENV_TARGET === 'cloud' || process.env.NODE_ENV === 'production';
export const isLocal = () => !isCloud();
