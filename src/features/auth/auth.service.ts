import { prisma } from '../../core/db/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../core/config/index.js';
import prismaErrorHandler from '../../core/utils/prismaErrorHandler.js';
import getRefreshTokenExpiryDate from '../../core/utils/tokenExpiryUtil.js';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import { logger } from '../../core/logger.js';
import {
    InternalServerError,
    UnauthorizedError,
} from '../../core/errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { RefreshTokenPayloadSchema } from './auth.types.js';
import type {
    LoginRequestDto,
    RegisterRequestDto,
} from '@blue0206/members-only-shared-types';
import type { User } from '../../core/db/prisma-client/client.js';
import type { StringValue } from 'ms';
import type {
    LoginServiceReturnType,
    RegisterServiceReturnType,
    AccessTokenPayload,
    RefreshTokenPayload,
    RefreshServiceReturnType,
} from './auth.types.js';
import jwtErrorHandler from '../../core/utils/jwtErrorHandler.js';

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
                    const refreshTokenPayload: RefreshTokenPayload = {
                        id: createdUser.id,
                    };

                    // Generate jwtid, a.k.a jti for refresh token. To be stored in DB.
                    const jti = uuidv4();

                    // Generate refresh token.
                    const refreshToken = this.generateRefreshToken(
                        refreshTokenPayload,
                        jti
                    );

                    // Hash the refresh token to store in DB.
                    const hashedRefreshToken = await bcrypt.hash(
                        refreshToken,
                        config.SALT_ROUNDS
                    );

                    // Add refresh token to refresh token table in DB.
                    await tx.refreshToken.create({
                        data: {
                            jwtId: jti,
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
        const accessTokenPayload: AccessTokenPayload = {
            id: user.id,
            username: user.username,
            role: mapPrismaRoleToEnumRole(user.role),
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

    async login(loginData: LoginRequestDto): Promise<LoginServiceReturnType> {
        // Log the start of login process.
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
        // If user not found, username is invalid.
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
        // If password does not match, password is invalid.
        if (!passwordMatch) {
            throw new UnauthorizedError(
                'Invalid username or password.',
                ErrorCodes.UNAUTHORIZED
            );
        }

        // Create access and refresh token payload.
        const refreshTokenPayload: RefreshTokenPayload = {
            id: user.id,
        };
        const accessTokenPayload: AccessTokenPayload = {
            id: user.id,
            username: user.username,
            role: mapPrismaRoleToEnumRole(user.role),
        };

        // Generate access token.
        const accessToken = this.generateAccessToken(accessTokenPayload);

        // Generate jti for refresh token.
        const jti = uuidv4();
        // Generate refresh token.
        const refreshToken = this.generateRefreshToken(refreshTokenPayload, jti);
        // Hash the refresh token to store in DB.
        const hashedRefreshToken = await bcrypt.hash(
            refreshToken,
            config.SALT_ROUNDS
        );

        // Add refresh token to refresh token table in DB.
        await prismaErrorHandler(() =>
            prisma.refreshToken.create({
                data: {
                    jwtId: jti,
                    userId: user.id,
                    tokenHash: hashedRefreshToken,
                    expiresAt: getRefreshTokenExpiryDate(),
                },
            })
        );

        // Log login process success.
        logger.info(
            { username: user.username, role: user.role },
            'Login successful'
        );

        // Return user, access token, and refresh token.
        return {
            ...user,
            accessToken,
            refreshToken,
        };
    }

    async logout(refreshToken: string): Promise<void> {
        // Log the start of logout process.
        logger.info('Logout started');

        // Decode the refresh token to get user id and jti.
        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                // Verify jwt.
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                // Parse against Zod schema for type safety.
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                // Return the typed, parsed token.
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

        // Log logout process success.
        logger.info({ userId: decodedRefreshToken.id }, 'Logout successful');
    }

    async refresh(refreshToken: string): Promise<RefreshServiceReturnType> {
        // Log the start of refresh process.
        logger.info('Token refresh process started.');

        // Verify refresh token and get user id and jti.
        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                // Verify jwt.
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                // Parse against Zod schema for type safety.
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                // Return the typed, parsed token.
                return parsedToken;
            }
        );

        // Remove refresh token entry from DB.
        await prismaErrorHandler(async () => {
            return await prisma.refreshToken.delete({
                where: {
                    userId: decodedRefreshToken.id,
                    jwtId: decodedRefreshToken.jti,
                },
            });
        });

        // Create new refresh token.
        const refreshTokenPayload: RefreshTokenPayload = {
            id: decodedRefreshToken.id,
        };
        const jti = uuidv4();
        const newRefreshToken = this.generateRefreshToken(refreshTokenPayload, jti);
        // Hash the refresh token to store in DB.
        const hashedRefreshToken = await bcrypt.hash(
            newRefreshToken,
            config.SALT_ROUNDS
        );

        // Start a transaction: add new refresh token to DB and fetch user role and username.
        const user: Pick<User, 'username' | 'role'> | null =
            await prismaErrorHandler(async () => {
                const userData: Pick<User, 'username' | 'role'> | null =
                    // Transaction start.
                    await prisma.$transaction(async (tx) => {
                        // Add new refresh token to DB.
                        await tx.refreshToken.create({
                            data: {
                                userId: decodedRefreshToken.id,
                                jwtId: jti,
                                tokenHash: hashedRefreshToken,
                                expiresAt: getRefreshTokenExpiryDate(),
                            },
                        });
                        // Fetch user role and username.
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

        // Throw error if user not found.
        if (!user) {
            throw new InternalServerError(
                'User not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        // Generate access token.
        const accessTokenPayload: AccessTokenPayload = {
            id: decodedRefreshToken.id,
            username: user.username,
            role: mapPrismaRoleToEnumRole(user.role),
        };
        const accessToken = this.generateAccessToken(accessTokenPayload);

        // Log refresh process success.
        logger.info(
            { username: user.username, role: user.role },
            'Token refresh process successful.'
        );

        // Return the access and refresh tokens.
        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    }

    // Access Token generator method.
    private generateAccessToken(payload: AccessTokenPayload): string {
        return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {
            expiresIn: config.ACCESS_TOKEN_EXPIRY as StringValue,
        });
    }

    // Refresh Token generator method.
    private generateRefreshToken(payload: RefreshTokenPayload, jti: string): string {
        return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {
            expiresIn: config.REFRESH_TOKEN_EXPIRY as StringValue,
            jwtid: jti,
        });
    }
}

export const authService = new AuthService();
