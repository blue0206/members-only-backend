import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { RegisterRequestSchema } from "@blue0206/members-only-shared-types";
import type {
  RegisterRequestDto,
  RegisterResponseDto,
} from "@blue0206/members-only-shared-types";
import type { RegisterServiceReturnType } from "./auth.types.js";
import { mapToRegisterResponseDto } from "./auth.mapper.js";

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsedBody = RegisterRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new Error("Parse failed.");
  }
  const registerData: RegisterRequestDto = parsedBody.data;
  const userData: RegisterServiceReturnType =
    await authService.register(registerData);
  const responseData: RegisterResponseDto = mapToRegisterResponseDto(userData);
  res.status(201).json(responseData);
};
