import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { createLogger } from '@repo/logger';
import { env } from './env.js';

const logger = createLogger(env.isDev ? 'debug' : 'info', env.isDev);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.isDev ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!env.isProd) {
  globalForPrisma.prisma = prisma;
}

export async function checkDbConnection(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ error }, 'Database connection failed');
  }
}

export { env } from './env.js';
export * from '../generated/prisma/client.js';
export default prisma;
