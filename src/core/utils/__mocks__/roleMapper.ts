import { vi } from 'vitest';
import type { Role } from '@blue0206/members-only-shared-types';

export const mapPrismaRoleToEnumRole = vi
    .fn()
    .mockImplementation((role) => role as Role);
