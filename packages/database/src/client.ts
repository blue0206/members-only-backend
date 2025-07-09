import { PrismaClient } from '../generated/client';

// Instantiate the extended Prisma client to infer its type
const prismaInstance = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Use globalThis for broader environment compatibility
const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: PrismaClient;
};

// Named export with global memoization
export const prisma: PrismaClient = globalForPrisma.prisma ?? prismaInstance;

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
