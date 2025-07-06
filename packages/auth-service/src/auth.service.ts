import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@members-only/database';
import {
    config,
    prismaErrorHandler,
    jwtErrorHandler,
    getRefreshTokenExpiryDate,
    mapPrismaRoleToEnumRole,
    InternalServerError,
    UnauthorizedError,
    RefreshTokenPayloadSchema,
    deleteFile,
    uploadFile,
} from '@members-only/core-utils';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type {
    LoginRequestDto,
    RegisterRequestDto,
} from '@blue0206/members-only-shared-types';
import type { RefreshToken, User } from '@members-only/database';
import type { StringValue } from 'ms';
import type {
    LoginServiceReturnType,
    RegisterServiceReturnType,
    GetSessionsServiceReturnType,
} from './auth.types.js';
import type {
    ClientDetailsType,
    Logger,
    RefreshTokenPayload,
    AccessTokenPayload,
} from '@members-only/core-utils';
import type { RefreshServiceReturnType } from './auth.types.js';

export class AuthService {
    async register(
        registerData: RegisterRequestDto,
        avatarImage: Buffer | undefined,
        clientDetails: ClientDetailsType,
        log: Logger
    ): Promise<RegisterServiceReturnType> {
        log.info({ username: registerData.username }, 'Registration started');

        // If avatarImage buffer has been provided, upload it to cloudinary and store
        // the public id in it to store in DB.
        let avatarPublicId: string | null = null;
        if (avatarImage) {
            log.info('User avatar received. Uploading avatar to Cloudinary....');
            avatarPublicId = await uploadFile(
                avatarImage,
                registerData.username,
                log
            );
        }

        const hashedPassword = await bcrypt.hash(
            registerData.password,
            config.SALT_ROUNDS
        );

        let user: Omit<RegisterServiceReturnType, 'accessToken'>;

        // Start a transaction to create new user, generate refresh token from
        // newly created user's id, and add refresh token entry into DB.
        // The transaction is wrapped in an error handler for prisma DB queries
        // to handle prisma-specific errors.
        try {
            user = await prismaErrorHandler(
                () =>
                    prisma.$transaction(async (tx) => {
                        // Create user and omit password to safely return it
                        // and use its details to generate refresh token.
                        const createdUser: Omit<User, 'password'> =
                            await tx.user.create({
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
                            });

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
                    }),
                log
            );
        } catch (error) {
            // Delete newly uploaded file from cloudinary (if provided)
            // as registration process failed.
            if (avatarPublicId) {
                log.error(
                    { error },
                    'User registration failed. Reverting cloudinary upload....'
                );
                await deleteFile(avatarPublicId, log);
            } else {
                log.error({ error }, 'Error registering user in database.');
            }
            throw error;
        }

        const accessTokenPayload: AccessTokenPayload = {
            id: user.id,
            username: user.username,
            role: mapPrismaRoleToEnumRole(user.role),
        };

        const accessToken = this.generateAccessToken(accessTokenPayload);

        log.info(
            { username: user.username, role: user.role },
            ' User registration successful'
        );

        // TODO: Handle when SNS is set up.
        // Send event to all admins to update their user list.
        // sseService.multicastEventToRoles<SseEventNamesType, UserEventPayloadDto>(
        //     [Role.ADMIN],
        //     {
        //         event: SseEventNames.USER_EVENT,
        //         data: {
        //             originId: user.id,
        //             reason: EventReason.USER_CREATED,
        //         },
        //     }
        // );

        return {
            ...user,
            accessToken,
        };
    }

    async login(
        loginData: LoginRequestDto,
        clientDetails: ClientDetailsType,
        log: Logger
    ): Promise<LoginServiceReturnType> {
        log.info({ username: loginData.username }, 'Login started');

        // Find user in DB and get details for comparing password and
        // returning user details.
        const user: User | null = await prismaErrorHandler(
            () =>
                prisma.user.findUnique({
                    where: {
                        username: loginData.username,
                    },
                }),
            log
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
        await prismaErrorHandler(
            () =>
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
                }),
            log
        );

        log.info({ username: user.username, role: user.role }, 'Login successful');

        return {
            ...user,
            accessToken,
            refreshToken,
        };
    }

    async logout(refreshToken: string, log: Logger): Promise<void> {
        log.info('Logout started');

        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                return parsedToken;
            },
            log
        );

        // Delete refresh token from DB based on jti and user id.
        await prismaErrorHandler(
            () =>
                prisma.refreshToken.delete({
                    where: {
                        userId: decodedRefreshToken.id,
                        jwtId: decodedRefreshToken.jti,
                    },
                }),
            log
        );

        log.info('Logout successful');
    }

    async refresh(
        refreshToken: string,
        clientDetails: ClientDetailsType,
        log: Logger
    ): Promise<RefreshServiceReturnType> {
        log.info('Token refresh process started.');

        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                return parsedToken;
            },
            log
        );

        // Check if refresh token is in DB and hence a valid token.
        const refreshTokenEntry = await prismaErrorHandler(async () => {
            return await prisma.refreshToken.findUnique({
                where: {
                    userId: decodedRefreshToken.id,
                    jwtId: decodedRefreshToken.jti,
                },
            });
        }, log);
        if (!refreshTokenEntry) {
            throw new UnauthorizedError(
                'The refresh token is invalid.',
                ErrorCodes.INVALID_TOKEN
            );
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
        const user: Omit<User, 'password'> | null = await prismaErrorHandler(
            async () => {
                const userData: Omit<User, 'password'> | null =
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
                                succeedsJwtId: decodedRefreshToken.jti,
                            },
                        });

                        return await tx.user.findUnique({
                            where: {
                                id: decodedRefreshToken.id,
                            },
                            omit: {
                                password: true,
                            },
                        });
                    });
                return userData;
                // Transaction end.
            },
            log
        );

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

        log.info(
            { username: user.username, role: user.role },
            'Token refresh process successful.'
        );

        return {
            ...user,
            accessToken,
            refreshToken: newRefreshToken,
        };
    }

    async getSessions(
        userId: number,
        refreshToken: string,
        log: Logger
    ): Promise<GetSessionsServiceReturnType> {
        log.info('Getting user sessions from database.');

        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                return parsedToken;
            },
            log
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
            },
            log
        );

        log.info('User sessions successfully retrieved from database.');
        return {
            sessions,
            currentSessionId: decodedRefreshToken.jti,
        };
    }

    async revokeSession(
        userId: number,
        sessionId: string,
        log: Logger
    ): Promise<void> {
        log.info({ sessionId }, 'Revoking session from database.');

        await prismaErrorHandler(async () => {
            return await prisma.refreshToken.delete({
                where: {
                    userId,
                    jwtId: sessionId,
                },
            });
        }, log);

        log.info({ sessionId }, 'Session revoked successfully.');
    }

    async revokeAllOtherSessions(
        userId: number,
        refreshToken: string,
        log: Logger
    ): Promise<void> {
        log.info('Revoking all other sessions from database.');

        const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
            (): RefreshTokenPayload => {
                const decodedToken = jwt.verify(
                    refreshToken,
                    config.REFRESH_TOKEN_SECRET
                );
                const parsedToken: RefreshTokenPayload =
                    RefreshTokenPayloadSchema.parse(decodedToken);

                return parsedToken;
            },
            log
        );
        if (!decodedRefreshToken.jti) {
            throw new UnauthorizedError(
                'Invalid refresh token: missing jti claim.',
                ErrorCodes.INVALID_TOKEN
            );
        }

        await prismaErrorHandler(async () => {
            return await prisma.refreshToken.deleteMany({
                where: {
                    userId,
                    jwtId: {
                        not: decodedRefreshToken.jti,
                    },
                },
            });
        }, log);

        log.info('All other sessions revoked successfully.');
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
