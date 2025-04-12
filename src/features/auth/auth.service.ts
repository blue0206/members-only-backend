import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../core/config/index.js";
import ms from "ms";
import type { StringValue } from "ms";
import type { JwtPayload } from "./auth.types.js";

class AuthService {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {
      expiresIn: ms(config.ACCESS_TOKEN_EXPIRY as StringValue),
      jwtid: uuidv4(),
    });
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {
      expiresIn: ms(config.REFRESH_TOKEN_EXPIRY as StringValue),
      jwtid: uuidv4(),
    });
  }
}

export const authService = new AuthService();
