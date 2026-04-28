/**
 * Storage module - database and object store clients
 */

import { PrismaClient } from '@prisma/client';

// Singleton Prisma client
let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
    });
  }
  return prisma;
}

export async function connectDatabase(): Promise<void> {
  const client = getPrisma();
  await client.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
