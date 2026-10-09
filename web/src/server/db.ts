/**
 * Prisma client singleton (Prisma 7: generated client + pg driver adapter).
 * Dev server hot-reloads modules; caching the client on globalThis prevents
 * exhausting Postgres connections with a new client per reload. A single
 * instance is safe: this is a long-lived Node process (standalone adapter),
 * not serverless.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
