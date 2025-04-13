import { prisma } from '../../core/db/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import ms from 'ms';
import { config } from '../../core/config/index.js';
import prismaErrorHandler from '../../core/utils/prismaErrorHandler.js';
import getRefreshTokenExpiryDate from '../../core/utils/tokenExpiryUtil.js';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import { logger } from '../../core/logger.js';
import type { RegisterRequestDto } from '@blue0206/members-only-shared-types';
import type { User } from '../../core/db/prisma-client/client.js';
import type { StringValue } from 'ms';
import type { JwtPayload, RegisterServiceReturnType } from './auth.types.js';

class AuthService {
    async register(
        registerData: RegisterRequestDto
    ): Promise<RegisterServiceReturnType> {
        // Log the start of registration process.
        logger.info({ username: registerData.username }, 'Registration started');
        // Hash the password with bcrypt.
        // Any errors will automatically be bubbled up and handled
        // in error middleware.
        const hashedPassword = await bcrypt.hash(
            registerData.password,
            config.SALT_ROUNDS
        );

        // Start a transaction to create new user, generate refresh token from
        // newly created user's id, and add refresh token entry into DB.
        // The transaction is wrapped in an error handler for prisma DB queries
        // to handle prisma-specific errors.
        const user: Omit<RegisterServiceReturnType, 'accessToken'> =
            await prismaErrorHandler(() =>
                // Transaction Start.
                prisma.$transaction(async (tx) => {
                    // Create user and omit password to safely return it
                    // and use its details to generate refresh token.
                    const createdUser: Omit<User, 'password'> = await tx.user.create(
                        {
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
                        }
                    );

                    // Create refresh token payload from relevant user details.
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
                        jwtId
                    );

                    // Hash the refresh token to store in DB.
                    const hashedRefreshToken = await bcrypt.hash(
                        refreshToken,
                        config.SALT_ROUNDS
                    );

                    // Add refresh token to refresh token table in DB.
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
                    // Transaction End.
                })
            );
        // Create access token payload from user details.
        const accessTokenPayload: JwtPayload = {
            id: user.id,
            role: mapPrismaRoleToEnumRole(user.role),
            username: user.username,
        };

        // Generate access token.
        const accessToken = this.generateAccessToken(accessTokenPayload);

        // Log registration process success.
        logger.info(
            { username: user.username, role: user.role },
            ' User registration successful'
        );

        // Return user, access token, and refresh token.
        return {
            ...user,
            accessToken,
        };
    }

    // Access Token generator method.
    generateAccessToken(payload: JwtPayload): string {
        return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {
            expiresIn: ms(config.ACCESS_TOKEN_EXPIRY as StringValue),
            jwtid: uuidv4(),
        });
    }

    // Refresh Token generator method.
    generateRefreshToken(payload: JwtPayload, jwtId: string): string {
        return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {
            expiresIn: ms(config.REFRESH_TOKEN_EXPIRY as StringValue),
            jwtid: jwtId,
        });
    }
}

export const authService = new AuthService();
