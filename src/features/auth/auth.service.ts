import { prisma } from '../../core/db/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../core/config/index.js';
import prismaErrorHandler from '../../core/utils/prismaErrorHandler.js';
import jwtErrorHandler from '../../core/utils/jwtErrorHandler.js';
import getRefreshTokenExpiryDate from '../../core/utils/tokenExpiryUtil.js';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import { logger } from '../../core/logger.js';
import {
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
} from '../../core/errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { RefreshTokenPayloadSchema } from './auth.types.js';
import { uploadFile } from '../../core/lib/cloudinary.js';
import type {
    LoginRequestDto,
    RegisterRequestDto,
} from '@blue0206/members-only-shared-types';
import type { RefreshToken, User } from '../../core/db/prisma-client/client.js';
import type { StringValue } from 'ms';
import type {
    LoginServiceReturnType,
    RegisterServiceReturnType,
    AccessTokenPayload,
    RefreshTokenPayload,
    RefreshServiceReturnType,
    GetSessionsServiceReturnType,
} from './auth.types.js';
import type { ClientDetailsType } from '../../core/middlewares/assignClientDetails.js';

class AuthService {
    async register(
        registerData: RegisterRequestDto,
        avatarImage: Buffer | undefined,
        clientDetails: ClientDetailsType
    ): Promise<RegisterServiceReturnType> {
        logger.info({ username: registerData.username }, 'Registration started');

        // If avatarImage buffer has been provided, upload it to cloudinary and store
        // the public id in it to store in DB.
        let avatarPublicId: string | null;
        if (avatarImage) {
            avatarPublicId = await uploadFile(avatarImage, registerData.username);
        }

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
                                avatar: avatarPublicId,
                            },
                            omit: {
                                password: true,
                            },
                        }
                    );

                    const refreshTokenPayload: RefreshTokenPayload = {
                        id: createdUser.id,
                    };

                    const jti = uuidv4();
                    const refreshToken = this.generateRefreshToken(
                        refreshTokenPayload,
                        jti
                    );

                    const hashedRefreshToken = await bcrypt.hash(
                        refreshToken,
                        config.SALT_ROUNDS
                    );

                    await tx.refreshToken.create({
                        data: {
                            jwtId: jti,
                            userId: createdUser.id,
                            tokenHash: hashedRefreshToken,
                            expiresAt: getRefreshTokenExpiryDate(),
                            ip: clientDetails.ip,
                            userAgent: clientDetails.userAgent,
                            location: clientDetails.location,
                        },
                    });

                    return {
                        ...createdUser,
                        refreshToken,
                    };
                    // Transaction End.
                })
            );

        const accessTokenPayload: AccessTokenPayload = {
            id: user.id,
            username: user.username,
            role: mapPrismaRoleToEnumRole(user.role),
        };

        const accessToken = this.generateAccessToken(accessTokenPayload);

        logger.info(
            { username: user.username, role: user.role },
            ' User registration successful'
        );

        return {
            ...user,
            accessToken,
        };
    }

    async login(
        loginData: LoginRequestDto,
        clientDetails: ClientDetailsType
    ): Promise<LoginServiceReturnType> {
        logger.info({ username: loginData.username }, 'Login started');

        // Find user in DB and get details for comparing password and
        // returning user details.
        const user: User | null = await prismaErrorHandler(() =>
            prisma.user.findUnique({
                where: {
                    username: loginData.username,
                },
            })
        );

        if (!user) {
            throw new UnauthorizedError(
                'Invalid username or password.',
                ErrorCodes.UNAUTHORIZED
            );
        }

        const passwordMatch = await bcrypt.compare(
            loginData.password,
            user.password
        );
        if (!passwordMatch) {
            throw new UnauthorizedError(
                'Invalid username or password.',
                ErrorCodes.UNAUTHORIZED
            );
        }

        const refreshTokenPayload: RefreshTokenPayload = {
            id: user.id,
        };

        const accessTokenPayload: AccessTokenPayload = {
            id: user.id,
            username: user.username,
            role: mapPrismaRoleToEnumRole(user.role),
        };
        const accessToken = this.generateAccessToken(accessTokenPayload);

        const jti = uuidv4();
        const refreshToken = this.generateRefreshToken(refreshTokenPayload, jti);
        const hashedRefreshToken = await bcrypt.hash(
            refreshToken,
            config.SALT_ROUNDS
        );
        await prismaErrorHandler(() =>
            prisma.refreshToken.create({
                data: {
                    jwtId: jti,
                    userId: user.id,
                    tokenHash: hashedRefreshToken,
                    expiresAt: getRefreshTokenExpiryDate(),
                    ip: clientDetails.ip,
                    location: clientDetails.location,
                    userAgent: clientDetails.userAgent,
                },
            })
        );

        logger.info(
            { username: user.username, role: user.role },
            'Login successful'
        );

        return {
            ...user,
            accessToken,
            refreshToken,
        };
    }

    async logout(refreshToken: string): Promise<void> {
        logger.info('Logout started');

        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                return parsedToken;
            }
        );

        // Delete refresh token from DB based on jti and user id.
        await prismaErrorHandler(() =>
            prisma.refreshToken.delete({
                where: {
                    userId: decodedRefreshToken.id,
                    jwtId: decodedRefreshToken.jti,
                },
            })
        );

        logger.info({ userId: decodedRefreshToken.id }, 'Logout successful');
    }

    async refresh(
        refreshToken: string,
        clientDetails: ClientDetailsType
    ): Promise<RefreshServiceReturnType> {
        logger.info('Token refresh process started.');

        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                return parsedToken;
            }
        );

        // Remove refresh token entry from DB and catch
        // and throw proper error for invalid token.
        try {
            await prismaErrorHandler(async () => {
                return await prisma.refreshToken.delete({
                    where: {
                        userId: decodedRefreshToken.id,
                        jwtId: decodedRefreshToken.jti,
                    },
                });
            });
        } catch (error: unknown) {
            if (error instanceof NotFoundError) {
                throw new UnauthorizedError(
                    'The refresh token is invalid.',
                    ErrorCodes.INVALID_TOKEN
                );
            }
            throw error;
        }

        // Create new refresh token.
        const refreshTokenPayload: RefreshTokenPayload = {
            id: decodedRefreshToken.id,
        };
        const jti = uuidv4();
        const newRefreshToken = this.generateRefreshToken(refreshTokenPayload, jti);
        const hashedRefreshToken = await bcrypt.hash(
            newRefreshToken,
            config.SALT_ROUNDS
        );

        // Start a transaction: add new refresh token to DB and fetch user role and username.
        const user: Pick<User, 'username' | 'role'> | null =
            await prismaErrorHandler(async () => {
                const userData: Pick<User, 'username' | 'role'> | null =
                    await prisma.$transaction(async (tx) => {
                        await tx.refreshToken.create({
                            data: {
                                userId: decodedRefreshToken.id,
                                jwtId: jti,
                                tokenHash: hashedRefreshToken,
                                expiresAt: getRefreshTokenExpiryDate(),
                                ip: clientDetails.ip,
                                location: clientDetails.location,
                                userAgent: clientDetails.userAgent,
                            },
                        });

                        return await tx.user.findUnique({
                            where: {
                                id: decodedRefreshToken.id,
                            },
                            select: {
                                username: true,
                                role: true,
                            },
                        });
                    });
                return userData;
                // Transaction end.
            });

        if (!user) {
            throw new InternalServerError(
                'User not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        const accessTokenPayload: AccessTokenPayload = {
            id: decodedRefreshToken.id,
            username: user.username,
            role: mapPrismaRoleToEnumRole(user.role),
        };
        const accessToken = this.generateAccessToken(accessTokenPayload);

        logger.info(
            { username: user.username, role: user.role },
            'Token refresh process successful.'
        );

        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    }

    async getSessions(
        userId: number,
        refreshToken: string
    ): Promise<GetSessionsServiceReturnType> {
        logger.info('Getting user sessions from database.');

        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                return parsedToken;
            }
        );
        if (!decodedRefreshToken.jti) {
            throw new UnauthorizedError(
                'Invalid refresh token: missing jti claim.',
                ErrorCodes.INVALID_TOKEN
            );
        }

        const sessions: Omit<RefreshToken, 'tokenHash'>[] = await prismaErrorHandler(
            async () => {
                return await prisma.refreshToken.findMany({
                    where: {
                        userId,
                    },
                    omit: {
                        tokenHash: true,
                    },
                });
            }
        );

        logger.info('User sessions successfully retrieved from database.');
        return {
            sessions,
            currentSessionId: decodedRefreshToken.jti,
        };
    }

    async revokeSession(userId: number, sessionId: string): Promise<void> {
        logger.info({ userId, sessionId }, 'Revoking session from database.');

        await prismaErrorHandler(async () => {
            return await prisma.refreshToken.delete({
                where: {
                    userId,
                    jwtId: sessionId,
                },
            });
        });

        logger.info({ userId, sessionId }, 'Session revoked successfully.');
    }

    private generateAccessToken(payload: AccessTokenPayload): string {
        return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {
            expiresIn: config.ACCESS_TOKEN_EXPIRY as StringValue,
        });
    }

    private generateRefreshToken(payload: RefreshTokenPayload, jti: string): string {
        return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {
            expiresIn: config.REFRESH_TOKEN_EXPIRY as StringValue,
            jwtid: jti,
        });
    }
}

export const authService = new AuthService();
