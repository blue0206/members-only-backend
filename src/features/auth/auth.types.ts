import type { Role } from "@blue0206/members-only-shared-types";

export interface JwtPayload {
  id: number;
  username: string;
  role: Role;
}
