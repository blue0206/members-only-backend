import { RegisterResponseSchema } from "@blue0206/members-only-shared-types";
import type { RegisterResponseDto } from "@blue0206/members-only-shared-types";
import type { User } from "../../core/db/prisma-client/client.js";
import { mapPrismaRoleToEnumRole } from "../../core/utils/roleMapper.js";

export const mapToRegisterResponseDto = (
  userData: User,
  accessToken: string,
): RegisterResponseDto => {
  const mappedData: RegisterResponseDto = {
    id: userData.id,
    username: userData.username,
    firstname: userData.firstName,
    middlename: userData.middleName,
    lastname: userData.lastName,
    avatar: userData.avatar,
    role: mapPrismaRoleToEnumRole(userData.role),
    accessToken,
  };
  const parsedData = RegisterResponseSchema.safeParse(mappedData);
  if (!parsedData.success) {
    throw new Error("To be handled later.");
  }
  return parsedData.data;
};
