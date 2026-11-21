import { initEnv } from '@repo/env';
import { defineConfig } from 'prisma/config';

initEnv();

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/collab',
  },
});
