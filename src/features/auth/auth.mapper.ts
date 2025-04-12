import { RegisterResponseSchema } from "@blue0206/members-only-shared-types";
import type { RegisterResponseDto } from "@blue0206/members-only-shared-types";
import { mapPrismaRoleToEnumRole } from "../../core/utils/roleMapper.js";
import type { RegisterServiceReturnType } from "./auth.types.js";

export const mapToRegisterResponseDto = (
  userData: RegisterServiceReturnType,
): RegisterResponseDto => {
  const mappedData: RegisterResponseDto = {
    id: userData.id,
    username: userData.username,
    firstname: userData.firstName,
    middlename: userData.middleName,
    lastname: userData.lastName,
    avatar: userData.avatar,
    role: mapPrismaRoleToEnumRole(userData.role),
    accessToken: userData.accessToken,
  };
  const parsedData = RegisterResponseSchema.safeParse(mappedData);
  if (!parsedData.success) {
    throw new Error("To be handled later.");
  }
  return parsedData.data;
};
