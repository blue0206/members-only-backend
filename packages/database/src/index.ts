import { PrismaClient } from './generated/client.js';

export const prisma = new PrismaClient({
    log: ['error', 'info', 'query', 'warn'],
});

export * from './generated/client.js';
