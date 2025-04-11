import { Role } from "@blue0206/members-only-shared-types";
import type { Role as PrismaRole } from "../db/prisma-client/client.js";

export function mapPrismaRoleToEnumRole(prismaRole: PrismaRole): Role {
  switch (prismaRole) {
    case "ADMIN":
      return Role.ADMIN;
      break;
    case "MEMBER":
      return Role.MEMBER;
      break;
    case "USER":
      return Role.USER;
  }
}
