import { beforeEach } from 'vitest';
import { mockReset, mockDeep } from 'vitest-mock-extended';
import type { PrismaClient } from '../prisma-client/client.js';

beforeEach(() => {
    mockReset(prisma);
});

export const prisma = mockDeep<PrismaClient>();
