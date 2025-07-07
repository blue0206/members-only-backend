import { Role } from '@blue0206/members-only-shared-types/enums/roles.enum';
import type { Role as PrismaRole } from '@members-only/database';

export function mapPrismaRoleToEnumRole(prismaRole: PrismaRole): Role {
    switch (prismaRole) {
        case 'ADMIN':
            return Role.ADMIN;
            break;
        case 'MEMBER':
            return Role.MEMBER;
            break;
        case 'USER':
            return Role.USER;
    }
}
