import type { RegisterRequestDto } from "@blue0206/members-only-shared-types";
import type { User } from "../../core/db/prisma-client/client.js";
import { prisma } from "../../core/db/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../core/config/index.js";
import ms from "ms";
import type { StringValue } from "ms";
import type { JwtPayload, RegisterServiceReturnType } from "./auth.types.js";
import { mapPrismaRoleToEnumRole } from "../../core/utils/roleMapper.js";
import getRefreshTokenExpiryDate from "../../core/utils/tokenExpiryUtil.js";

class AuthService {
  async register(
    registerData: RegisterRequestDto,
  ): Promise<RegisterServiceReturnType> {
    // Hash the password with bcrypt.
    const hashedPassword = await bcrypt.hash(registerData.password, 11);

    // Start a transaction to create new user, generate refresh token from
    // newly created user's id, and add refresh token entry into DB.
    const user: Omit<RegisterServiceReturnType, "accessToken"> =
      await prisma.$transaction(async (tx) => {
        // Create user and pick id to generate refresh token.
        const createdUser: Omit<User, "password"> = await tx.user.create({
          data: {
            username: registerData.username,
            password: hashedPassword,
            firstName: registerData.firstname,
            middleName: registerData.middlename ?? null,
            lastName: registerData.lastname ?? null,
            avatar: registerData.avatar ?? null,
          },
          omit: {
            password: true,
          },
        });

        // Create refresh token payload.
        const refreshTokenPayload: JwtPayload = {
          id: createdUser.id,
          username: createdUser.username,
          role: mapPrismaRoleToEnumRole(createdUser.role),
        };

        // Generate jwtid for refresh token. To be stored in DB.
        const jwtId = uuidv4();

        // Generate refresh token.
        const refreshToken = this.generateRefreshToken(
          refreshTokenPayload,
          jwtId,
        );

        // Hash the refresh token to store in DB.
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 11);

        // Add refresh token to DB.
        await tx.refreshToken.create({
          data: {
            jwtId,
            userId: createdUser.id,
            tokenHash: hashedRefreshToken,
            expiresAt: getRefreshTokenExpiryDate(),
          },
        });

        // Return created user and refresh token.
        return {
          ...createdUser,
          refreshToken,
        };
      });

    // Create access token payload.
    const accessTokenPayload: JwtPayload = {
      id: user.id,
      role: mapPrismaRoleToEnumRole(user.role),
      username: user.username,
    };

    // Generate access token.
    const accessToken = this.generateAccessToken(accessTokenPayload);

    // Return user, access token, and refresh token.
    return {
      ...user,
      accessToken,
    };
  }

  // Generate Access Token
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {
      expiresIn: ms(config.ACCESS_TOKEN_EXPIRY as StringValue),
      jwtid: uuidv4(),
    });
  }

  // Generate Refresh Token
  generateRefreshToken(payload: JwtPayload, jwtId: string): string {
    return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {
      expiresIn: ms(config.REFRESH_TOKEN_EXPIRY as StringValue),
      jwtid: jwtId,
    });
  }
}

export const authService = new AuthService();
