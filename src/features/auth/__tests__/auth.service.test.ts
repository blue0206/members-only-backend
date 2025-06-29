/* eslint-disable @typescript-eslint/unbound-method */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma as prismaMock } from '../../../core/db/__mocks__/prisma.js';
import prismaErrorHandlerMock from '../../../core/utils/__mocks__/prismaErrorHandler.js';
import jwtErrorHandlerMock from '../../../core/utils/__mocks__/jwtErrorHandler.js';
import {
    uploadFile as uploadFileMock,
    deleteFile as deleteFileMock,
} from '../../../core/lib/__mocks__/cloudinary.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import getRefreshTokenExpiryDateMock from '../../../core/utils/__mocks__/tokenExpiryUtil.js';
import { config } from '../../../core/config/__mocks__/index.js';
import { mapPrismaRoleToEnumRole as mapPrismaRoleToEnumRoleMock } from '../../../core/utils/__mocks__/roleMapper.js';
import { sseService } from '../../sse/sse.service.js';
import {
    ErrorCodes,
    EventReason,
    Role,
    SseEventNames,
} from '@blue0206/members-only-shared-types';
import { UnauthorizedError } from '../../../core/errors/customErrors.js';
import { ZodError } from 'zod';
import type {
    LoginRequestDto,
    RegisterRequestDto,
} from '@blue0206/members-only-shared-types';
import type { ClientDetailsType } from '../../../core/middlewares/assignClientDetails.js';
import type { RefreshToken, User } from '../../../core/db/prisma-client/client.js';
import type {
    AccessTokenPayload,
    LoginServiceReturnType,
    RefreshServiceReturnType,
    RefreshTokenPayload,
    RegisterServiceReturnType,
} from '../auth.types.js';
import type { AppError } from '../../../core/errors/customErrors.js';

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'uuidv4'),
}));
vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn(),
    },
}));
vi.mock('../../../core/db/prisma.js');
vi.mock('../../../core/config/index.js');
vi.mock('../../../core/lib/cloudinary.js');
vi.mock('../../sse/sse.service.js');
vi.mock('../../../core/utils/prismaErrorHandler.js');
vi.mock('../../../core/utils/jwtErrorHandler.js');
vi.mock('../../../core/utils/roleMapper.js');
vi.mock('../../../core/utils/tokenExpiryUtil.js');

import { AuthService } from '../auth.service.js';

const MOCK_DATE = new Date();

describe('AuthService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('register', () => {
        let authService: AuthService;

        beforeEach(() => {
            authService = new AuthService();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should successfully register a new user with an avatar, create tokens, dispatch event, and return user data with tokens', async () => {
            // 1. Arrange----------------------------------------------------------------------------

            const registerData: RegisterRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
                firstname: 'Blue',
            };
            const avatarImage: Buffer = Buffer.from('avatar-image');
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };

            const mockCreatedUser: Omit<User, 'password'> = {
                id: 1,
                username: 'blue0206',
                firstName: 'Blue',
                avatar: 'mock-avatar-public-id',
                role: 'USER',
                createdAt: MOCK_DATE,
                updatedAt: MOCK_DATE,
                lastActive: MOCK_DATE,
                middleName: null,
                lastName: null,
            };

            const mockTransactionResult: Omit<
                RegisterServiceReturnType,
                'accessToken'
            > = {
                ...mockCreatedUser,
                refreshToken: 'mock-refresh-token',
            };

            uploadFileMock.mockResolvedValueOnce('mock-avatar-public-id');

            vi.mocked(bcrypt.hash)
                .mockResolvedValueOnce('hashed-pass' as never)
                .mockResolvedValueOnce('hashed-refresh-token' as never);

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.$transaction.mockImplementationOnce(async (callback) => {
                return await callback(prismaMock);
            });
            prismaMock.user.create.mockResolvedValueOnce(mockCreatedUser as User);
            getRefreshTokenExpiryDateMock.mockReturnValueOnce(MOCK_DATE);
            prismaMock.refreshToken.create.mockResolvedValueOnce({} as RefreshToken);

            mapPrismaRoleToEnumRoleMock.mockReturnValueOnce(mockCreatedUser.role);

            // generateAccessToken and generateRefreshToken are private class methods.
            const generateAccessTokenMock = vi
                .spyOn(authService, 'generateAccessToken' as keyof AuthService)
                .mockReturnValueOnce('mock-access-token' as never);
            const generateRefreshTokenMock = vi
                .spyOn(authService, 'generateRefreshToken' as keyof AuthService)
                .mockReturnValueOnce('mock-refresh-token' as never);

            // 2. Act------------------------------------------------------------------------------
            const result = await authService.register(
                registerData,
                avatarImage,
                clientDetails
            );

            // 3. Assert----------------------------------------------------------------------------
            // Assert that the uploadFile method is invoked with correct args.
            expect(uploadFileMock).toBeCalledTimes(1);
            expect(uploadFileMock).toBeCalledWith(
                avatarImage,
                registerData.username
            );

            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the password and refresh token are encrypted.
            expect(bcrypt.hash).toBeCalledTimes(2);
            expect(bcrypt.hash).toHaveBeenNthCalledWith(
                1,
                registerData.password,
                config.SALT_ROUNDS
            );
            expect(bcrypt.hash).toHaveBeenNthCalledWith(
                2,
                'mock-refresh-token',
                config.SALT_ROUNDS
            );

            // Assert that a new user is created in DB.
            expect(prismaMock.user.create).toBeCalledTimes(1);
            expect(prismaMock.user.create).toBeCalledWith({
                data: {
                    username: registerData.username,
                    password: 'hashed-pass',
                    firstName: registerData.firstname,
                    middleName: null,
                    lastName: null,
                    avatar: 'mock-avatar-public-id',
                },
                omit: {
                    password: true,
                },
            });

            // Assert that getRefreshTokenExpiryDate method is invoked.
            expect(getRefreshTokenExpiryDateMock).toBeCalledTimes(1);

            // Assert that a new refresh token is created in DB.
            expect(prismaMock.$transaction).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
                data: {
                    jwtId: 'uuidv4',
                    userId: mockCreatedUser.id,
                    tokenHash: 'hashed-refresh-token',
                    expiresAt: MOCK_DATE,
                    ip: clientDetails.ip,
                    userAgent: clientDetails.userAgent,
                    location: clientDetails.location,
                },
            });

            // Assert that the mapPrismaRoleToEnumRole utility is invoked with correct args.
            expect(mapPrismaRoleToEnumRoleMock).toBeCalledTimes(1);
            expect(mapPrismaRoleToEnumRoleMock).toBeCalledWith(mockCreatedUser.role);

            // Assert that new tokens are generated.
            expect(generateAccessTokenMock).toBeCalledTimes(1);
            expect(generateAccessTokenMock).toBeCalledWith({
                id: mockCreatedUser.id,
                username: mockCreatedUser.username,
                role: mockCreatedUser.role,
            });
            expect(generateRefreshTokenMock).toBeCalledTimes(1);
            expect(generateRefreshTokenMock).toBeCalledWith(
                {
                    id: mockCreatedUser.id,
                },
                'uuidv4'
            );

            // Assert that a new refresh token is created in DB.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(1);

            // Assert that the the multicast method of sseService is invoked with correct args.
            expect(sseService.multicastEventToRoles).toBeCalledTimes(1);
            expect(sseService.multicastEventToRoles).toBeCalledWith([Role.ADMIN], {
                event: SseEventNames.USER_EVENT,
                data: {
                    originId: mockCreatedUser.id,
                    reason: EventReason.USER_CREATED,
                },
            });
            expect(sseService.multicastEventToRoles).toReturnWith(undefined);

            // Assert that the register method returns user details, refresh token, and access token.
            expect(result).toStrictEqual({
                ...mockTransactionResult,
                accessToken: 'mock-access-token',
            } satisfies RegisterServiceReturnType);
        });

        it('should successfully register a new user without an avatar, create tokens, dispatch event, and return user data with tokens', async () => {
            // 1. Arrange------------------------------------------------------------------------------
            const registerData: RegisterRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
                firstname: 'Blue',
            };
            const avatarImage = undefined;
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };

            const mockCreatedUser: Omit<User, 'password'> = {
                id: 1,
                username: 'blue0206',
                firstName: 'Blue',
                avatar: null,
                role: 'USER',
                createdAt: MOCK_DATE,
                updatedAt: MOCK_DATE,
                lastActive: MOCK_DATE,
                middleName: null,
                lastName: null,
            };

            const mockTransactionResult: Omit<
                RegisterServiceReturnType,
                'accessToken'
            > = {
                ...mockCreatedUser,
                refreshToken: 'mock-refresh-token',
            };

            vi.mocked(bcrypt.hash)
                .mockResolvedValueOnce('hashed-pass' as never)
                .mockResolvedValueOnce('hashed-refresh-token' as never);

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.$transaction.mockImplementationOnce(async (callback) => {
                return await callback(prismaMock);
            });
            prismaMock.user.create.mockResolvedValueOnce(mockCreatedUser as User);
            getRefreshTokenExpiryDateMock.mockReturnValueOnce(MOCK_DATE);
            prismaMock.refreshToken.create.mockResolvedValueOnce({} as RefreshToken);

            mapPrismaRoleToEnumRoleMock.mockReturnValueOnce(mockCreatedUser.role);

            const generateAccessTokenMock = vi
                .spyOn(authService, 'generateAccessToken' as keyof AuthService)
                .mockReturnValueOnce('mock-access-token' as never);
            const generateRefreshTokenMock = vi
                .spyOn(authService, 'generateRefreshToken' as keyof AuthService)
                .mockReturnValueOnce('mock-refresh-token' as never);

            // 2. Act------------------------------------------------------------------------------
            const result = await authService.register(
                registerData,
                avatarImage,
                clientDetails
            );

            // 3. Assert----------------------------------------------------------------------------
            // Assert that the uploadFile method is not invoked.
            expect(uploadFileMock).toBeCalledTimes(0);

            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the password and refresh token are encrypted.
            expect(bcrypt.hash).toBeCalledTimes(2);
            expect(bcrypt.hash).toHaveBeenNthCalledWith(
                1,
                registerData.password,
                config.SALT_ROUNDS
            );
            expect(bcrypt.hash).toHaveBeenNthCalledWith(
                2,
                'mock-refresh-token',
                config.SALT_ROUNDS
            );

            // Assert that a new user is created in DB.
            expect(prismaMock.user.create).toBeCalledTimes(1);
            expect(prismaMock.user.create).toBeCalledWith({
                data: {
                    username: registerData.username,
                    password: 'hashed-pass',
                    firstName: registerData.firstname,
                    middleName: null,
                    lastName: null,
                    avatar: null,
                },
                omit: {
                    password: true,
                },
            });

            // Assert that getRefreshTokenExpiryDate method is invoked.
            expect(getRefreshTokenExpiryDateMock).toBeCalledTimes(1);

            // Assert that a new refresh token is created in DB.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
                data: {
                    jwtId: 'uuidv4',
                    userId: mockCreatedUser.id,
                    tokenHash: 'hashed-refresh-token',
                    expiresAt: MOCK_DATE,
                    ip: clientDetails.ip,
                    userAgent: clientDetails.userAgent,
                    location: clientDetails.location,
                },
            });

            // Assert that the transaction is used.
            expect(prismaMock.$transaction).toBeCalledTimes(1);

            // Assert that the mapPrismaRoleToEnumRole utility is invoked with correct args.
            expect(mapPrismaRoleToEnumRoleMock).toBeCalledTimes(1);
            expect(mapPrismaRoleToEnumRoleMock).toBeCalledWith(mockCreatedUser.role);

            // Assert that new tokens are generated.
            expect(generateAccessTokenMock).toBeCalledTimes(1);
            expect(generateAccessTokenMock).toBeCalledWith({
                id: mockCreatedUser.id,
                username: mockCreatedUser.username,
                role: mockCreatedUser.role,
            });
            expect(generateRefreshTokenMock).toBeCalledTimes(1);
            expect(generateRefreshTokenMock).toBeCalledWith(
                {
                    id: mockCreatedUser.id,
                },
                'uuidv4'
            );

            // Assert that the the multicast method of sseService is invoked with correct args.
            expect(sseService.multicastEventToRoles).toBeCalledTimes(1);
            expect(sseService.multicastEventToRoles).toBeCalledWith([Role.ADMIN], {
                event: SseEventNames.USER_EVENT,
                data: {
                    originId: mockCreatedUser.id,
                    reason: EventReason.USER_CREATED,
                },
            });
            expect(sseService.multicastEventToRoles).toReturnWith(undefined);

            // Assert that the register method returns user details, refresh token, and access token.
            expect(result).toStrictEqual({
                ...mockTransactionResult,
                accessToken: 'mock-access-token',
            } satisfies RegisterServiceReturnType);
        });

        it('should not perform database operations if avatar upload fails', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const registerData: RegisterRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
                firstname: 'Blue',
            };
            const avatarImage: Buffer = Buffer.from('avatar-image');
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };
            const uploadError = new Error('Upload to cloudinary failed.');

            uploadFileMock.mockRejectedValueOnce(uploadError);

            // generateAccessToken and generateRefreshToken are private class methods.
            const generateAccessTokenMock = vi.spyOn(
                authService,
                'generateAccessToken' as keyof AuthService
            );
            const generateRefreshTokenMock = vi.spyOn(
                authService,
                'generateRefreshToken' as keyof AuthService
            );

            // 2. Act------------------------------------------------------------------------------
            await expect(
                authService.register(registerData, avatarImage, clientDetails)
            ).rejects.toThrowError(uploadError);

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that the uploadFile method is invoked with correct args.
            expect(uploadFileMock).toBeCalledTimes(1);
            expect(uploadFileMock).toBeCalledWith(
                avatarImage,
                registerData.username
            );

            // Assert that prismaErrorHandler wrapper is not invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(0);

            // Assert that encryption is not performed.
            expect(bcrypt.hash).toBeCalledTimes(0);

            // Assert that event is not sent.
            expect(sseService.multicastEventToRoles).toBeCalledTimes(0);

            // Assert that new tokens are not generated.
            expect(generateAccessTokenMock).toBeCalledTimes(0);
            expect(generateRefreshTokenMock).toBeCalledTimes(0);

            // Assert that the deleteFile cloudinary method is not invoked.
            expect(deleteFileMock).toBeCalledTimes(0);
        });

        it('should throw an error and delete the uploaded avatar if user creation fails in the transaction', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const registerData: RegisterRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
                firstname: 'Blue',
            };
            const avatarImage: Buffer = Buffer.from('avatar-image');
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };
            const userCreationError = new Error(
                'Failed to create user in database.'
            );

            uploadFileMock.mockResolvedValueOnce('mock-avatar-public-id');

            vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-pass' as never);

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.$transaction.mockImplementationOnce(async (callback) => {
                return await callback(prismaMock);
            });
            prismaMock.user.create.mockRejectedValueOnce(userCreationError);

            const generateAccessTokenMock = vi.spyOn(
                authService,
                'generateAccessToken' as keyof AuthService
            );
            const generateRefreshTokenMock = vi.spyOn(
                authService,
                'generateRefreshToken' as keyof AuthService
            );

            // 2. Act------------------------------------------------------------------------------
            await expect(
                authService.register(registerData, avatarImage, clientDetails)
            ).rejects.toThrowError(userCreationError);

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that the uploadFile method is invoked with correct args.
            expect(uploadFileMock).toBeCalledTimes(1);
            expect(uploadFileMock).toBeCalledWith(
                avatarImage,
                registerData.username
            );

            // Assert that the deleteFile cloudinary method is invoked with correct args.
            expect(deleteFileMock).toBeCalledTimes(1);
            expect(deleteFileMock).toBeCalledWith('mock-avatar-public-id');

            // Assert that the password is encrypted but the refresh token is not (as the call should fail right before).
            expect(bcrypt.hash).toBeCalledTimes(1);
            expect(bcrypt.hash).toBeCalledWith(
                registerData.password,
                config.SALT_ROUNDS
            );
            expect(bcrypt.hash).not.toBeCalledWith(
                'mock-refresh-token',
                config.SALT_ROUNDS
            );

            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the prisma transaction is invoked.
            expect(prismaMock.$transaction).toBeCalledTimes(1);

            // Assert that the prisma.user.create is called.
            expect(prismaMock.user.create).toBeCalledTimes(1);
            expect(prismaMock.user.create).toBeCalledWith({
                data: {
                    username: registerData.username,
                    password: 'hashed-pass',
                    firstName: registerData.firstname,
                    middleName: null,
                    lastName: null,
                    avatar: 'mock-avatar-public-id',
                },
                omit: {
                    password: true,
                },
            });

            // Assert that the refresh token is not created in DB.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(0);

            // Assert that new tokens are not generated.
            expect(generateAccessTokenMock).toBeCalledTimes(0);
            expect(generateRefreshTokenMock).toBeCalledTimes(0);

            // Assert that event is not sent.
            expect(sseService.multicastEventToRoles).toBeCalledTimes(0);
        });

        it('should throw an error and delete the uploaded avatar if refresh token creation fails in the transaction', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const registerData: RegisterRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
                firstname: 'Blue',
            };
            const avatarImage: Buffer = Buffer.from('avatar-image');
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };
            const mockCreatedUser: Omit<User, 'password'> = {
                id: 1,
                username: 'blue0206',
                firstName: 'Blue',
                avatar: 'mock-avatar-public-id',
                role: 'USER',
                createdAt: MOCK_DATE,
                updatedAt: MOCK_DATE,
                lastActive: MOCK_DATE,
                middleName: null,
                lastName: null,
            };
            const refreshTokenCreationError = new Error(
                'Failed to add refresh token entry in database.'
            );

            uploadFileMock.mockResolvedValueOnce('mock-avatar-public-id');

            vi.mocked(bcrypt.hash)
                .mockResolvedValueOnce('hashed-pass' as never)
                .mockResolvedValueOnce('hashed-refresh-token' as never);

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.$transaction.mockImplementationOnce(async (callback) => {
                return await callback(prismaMock);
            });
            prismaMock.user.create.mockResolvedValueOnce(mockCreatedUser as User);
            getRefreshTokenExpiryDateMock.mockReturnValueOnce(MOCK_DATE);
            prismaMock.refreshToken.create.mockRejectedValueOnce(
                refreshTokenCreationError
            );

            const generateAccessTokenMock = vi.spyOn(
                authService,
                'generateAccessToken' as keyof AuthService
            );
            const generateRefreshTokenMock = vi
                .spyOn(authService, 'generateRefreshToken' as keyof AuthService)
                .mockReturnValueOnce('mock-refresh-token' as never);

            // 2. Act------------------------------------------------------------------------------
            await expect(
                authService.register(registerData, avatarImage, clientDetails)
            ).rejects.toThrowError(refreshTokenCreationError);

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that the uploadFile method is invoked with correct args.
            expect(uploadFileMock).toBeCalledTimes(1);
            expect(uploadFileMock).toBeCalledWith(
                avatarImage,
                registerData.username
            );

            // Assert that the deleteFile cloudinary method is invoked with correct args.
            expect(deleteFileMock).toBeCalledTimes(1);
            expect(deleteFileMock).toBeCalledWith('mock-avatar-public-id');

            // Assert that password and refresh token are encrypted.
            expect(bcrypt.hash).toBeCalledTimes(2);
            expect(bcrypt.hash).toHaveBeenNthCalledWith(
                1,
                registerData.password,
                config.SALT_ROUNDS
            );
            expect(bcrypt.hash).toHaveBeenNthCalledWith(
                2,
                'mock-refresh-token',
                config.SALT_ROUNDS
            );

            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the prisma transaction is invoked.
            expect(prismaMock.$transaction).toBeCalledTimes(1);

            // Assert that user is created in DB.
            expect(prismaMock.user.create).toBeCalledTimes(1);
            expect(prismaMock.user.create).toBeCalledWith({
                data: {
                    username: registerData.username,
                    password: 'hashed-pass',
                    firstName: registerData.firstname,
                    middleName: null,
                    lastName: null,
                    avatar: 'mock-avatar-public-id',
                },
                omit: {
                    password: true,
                },
            });

            // Assert that getRefreshTokenExpiryDate method is invoked.
            expect(getRefreshTokenExpiryDateMock).toBeCalledTimes(1);

            // Assert that the prisma.refreshToken.create is called.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
                data: {
                    jwtId: 'uuidv4',
                    userId: mockCreatedUser.id,
                    tokenHash: 'hashed-refresh-token',
                    expiresAt: MOCK_DATE,
                    ip: clientDetails.ip,
                    userAgent: clientDetails.userAgent,
                    location: clientDetails.location,
                },
            });

            // Assert that only refresh token is generated.
            expect(generateAccessTokenMock).toBeCalledTimes(0);
            expect(generateRefreshTokenMock).toBeCalledTimes(1);
            expect(generateRefreshTokenMock).toBeCalledWith(
                {
                    id: mockCreatedUser.id,
                },
                'uuidv4'
            );

            // Assert that event is not sent.
            expect(sseService.multicastEventToRoles).toBeCalledTimes(0);
        });

        it('should not try to delete an avatar if the transaction fails and no avatar was provided', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const registerData: RegisterRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
                firstname: 'Blue',
            };
            const avatarImage = undefined;
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };
            const transactionError = new Error('Transaction failed.');

            vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-pass' as never);

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.$transaction.mockRejectedValueOnce(transactionError);

            // 2. Act------------------------------------------------------------------------------
            await expect(
                authService.register(registerData, avatarImage, clientDetails)
            ).rejects.toThrowError(transactionError);

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that uploadFile cloudinary method is not invoked.
            expect(uploadFileMock).toBeCalledTimes(0);

            // Assert that deleteFile cloudinary method is not invoked.
            expect(deleteFileMock).toBeCalledTimes(0);

            // Assert that the password is encrypted.
            expect(bcrypt.hash).toBeCalledTimes(1);
            expect(bcrypt.hash).toBeCalledWith(
                registerData.password,
                config.SALT_ROUNDS
            );

            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the prisma transaction is invoked.
            expect(prismaMock.$transaction).toBeCalledTimes(1);
        });
    });

    describe('login', () => {
        let authService: AuthService;

        beforeEach(() => {
            authService = new AuthService();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should successfully login a user by comparing passwords, generating tokens, and return user details with tokens', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const loginData: LoginRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
            };
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };

            const mockUser: User = {
                id: 1,
                username: 'blue0206',
                firstName: 'Blue',
                avatar: 'mock-avatar-public-id',
                role: 'USER',
                password: 'hashed-pass',
                createdAt: MOCK_DATE,
                updatedAt: MOCK_DATE,
                lastActive: MOCK_DATE,
                middleName: null,
                lastName: null,
            };

            prismaErrorHandlerMock.mockImplementation(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
            prismaMock.refreshToken.create.mockResolvedValueOnce({} as RefreshToken);

            vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
            vi.mocked(bcrypt.hash).mockResolvedValueOnce(
                'hashed-refresh-token' as never
            );

            mapPrismaRoleToEnumRoleMock.mockReturnValueOnce(mockUser.role);

            getRefreshTokenExpiryDateMock.mockReturnValueOnce(MOCK_DATE);

            const generateAccessTokenMock = vi
                .spyOn(authService, 'generateAccessToken' as keyof AuthService)
                .mockReturnValueOnce('mock-access-token' as never);
            const generateRefreshTokenMock = vi
                .spyOn(authService, 'generateRefreshToken' as keyof AuthService)
                .mockReturnValueOnce('mock-refresh-token' as never);

            // 2. Act------------------------------------------------------------------------------
            const result = await authService.login(loginData, clientDetails);

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(2);

            // Assert that the prisma user.findUnique is invoked with correct args.
            expect(prismaMock.user.findUnique).toBeCalledTimes(1);
            expect(prismaMock.user.findUnique).toBeCalledWith({
                where: {
                    username: loginData.username,
                },
            });

            // Assert that bcrypt.compare is invoked with correct args.
            expect(bcrypt.compare).toBeCalledTimes(1);
            expect(bcrypt.compare).toBeCalledWith(
                loginData.password,
                mockUser.password
            );

            // Assert that bcrypt.hash is invoked with correct args.
            expect(bcrypt.hash).toBeCalledTimes(1);
            expect(bcrypt.hash).toBeCalledWith(
                'mock-refresh-token',
                config.SALT_ROUNDS
            );

            // Assert that the access and refresh token generator functions are called correctly.
            expect(generateAccessTokenMock).toBeCalledTimes(1);
            expect(generateAccessTokenMock).toBeCalledWith({
                id: mockUser.id,
                username: mockUser.username,
                role: mockUser.role,
            });
            expect(generateRefreshTokenMock).toBeCalledTimes(1);
            expect(generateRefreshTokenMock).toBeCalledWith(
                {
                    id: mockUser.id,
                },
                'uuidv4'
            );

            // Assert that the refresh token entry is added in db.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.create).toBeCalledWith({
                data: {
                    jwtId: 'uuidv4',
                    userId: mockUser.id,
                    tokenHash: 'hashed-refresh-token',
                    expiresAt: MOCK_DATE,
                    ip: clientDetails.ip,
                    location: clientDetails.location,
                    userAgent: clientDetails.userAgent,
                },
            });

            // Assert that the the login method returns user details with both access and refresh tokens.
            expect(result).toStrictEqual({
                ...mockUser,
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
            } satisfies LoginServiceReturnType);
        });

        it('should throw an Unauthorized Error if user not found in database', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const loginData: LoginRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
            };
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.user.findUnique.mockResolvedValueOnce(null);

            const generateAccessTokenMock = vi.spyOn(
                authService,
                'generateAccessToken' as keyof AuthService
            );
            const generateRefreshTokenMock = vi.spyOn(
                authService,
                'generateRefreshToken' as keyof AuthService
            );

            // 2. Act------------------------------------------------------------------------------
            await expect(
                authService.login(loginData, clientDetails)
            ).rejects.satisfies((error: AppError) => {
                expect(error).toBeInstanceOf(UnauthorizedError);
                expect(error.message).toBe('Invalid username or password.');
                expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
                expect(error.statusCode).toBe(401);
                return true;
            });

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the prisma user.findUnique is invoked with correct args.
            expect(prismaMock.user.findUnique).toBeCalledTimes(1);
            expect(prismaMock.user.findUnique).toBeCalledWith({
                where: {
                    username: loginData.username,
                },
            });

            // Assert that bcrypt.compare is not invoked.
            expect(bcrypt.compare).toBeCalledTimes(0);

            // Assert that bcrypt.hash is not invoked.
            expect(bcrypt.hash).toBeCalledTimes(0);

            // Assert that the access and refresh token generator functions are not called.
            expect(generateAccessTokenMock).toBeCalledTimes(0);
            expect(generateRefreshTokenMock).toBeCalledTimes(0);

            // Assert that the refresh token entry is not added in db.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(0);
        });

        it('should throw an Unauthorized Error if passwords do not match', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const loginData: LoginRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
            };
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };
            const mockUser: User = {
                id: 1,
                username: 'blue0206',
                firstName: 'Blue',
                avatar: 'mock-avatar-public-id',
                role: 'USER',
                password: 'hashed-pass',
                createdAt: MOCK_DATE,
                updatedAt: MOCK_DATE,
                lastActive: MOCK_DATE,
                middleName: null,
                lastName: null,
            };

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);

            vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

            const generateAccessTokenMock = vi.spyOn(
                authService,
                'generateAccessToken' as keyof AuthService
            );
            const generateRefreshTokenMock = vi.spyOn(
                authService,
                'generateRefreshToken' as keyof AuthService
            );

            // 2. Act------------------------------------------------------------------------------
            await expect(
                authService.login(loginData, clientDetails)
            ).rejects.satisfies((error: AppError) => {
                expect(error).toBeInstanceOf(UnauthorizedError);
                expect(error.message).toBe('Invalid username or password.');
                expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
                expect(error.statusCode).toBe(401);
                return true;
            });

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the prisma user.findUnique is invoked with correct args.
            expect(prismaMock.user.findUnique).toBeCalledTimes(1);
            expect(prismaMock.user.findUnique).toBeCalledWith({
                where: {
                    username: loginData.username,
                },
            });

            // Assert that bcrypt.compare is invoked with correct args.
            expect(bcrypt.compare).toBeCalledTimes(1);
            expect(bcrypt.compare).toBeCalledWith(
                loginData.password,
                mockUser.password
            );

            // Assert that bcrypt.hash is not invoked.
            expect(bcrypt.hash).toBeCalledTimes(0);

            // Assert that the access and refresh token generator functions are not called.
            expect(generateAccessTokenMock).toBeCalledTimes(0);
            expect(generateRefreshTokenMock).toBeCalledTimes(0);

            // Assert that the refresh token entry is not added in db.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(0);
        });

        it('should throw an error if user lookup database call fails', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const loginData: LoginRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
            };
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };
            const dbError = new Error('User lookup in database failed.');

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.user.findUnique.mockRejectedValueOnce(dbError);

            const generateAccessTokenMock = vi.spyOn(
                authService,
                'generateAccessToken' as keyof AuthService
            );
            const generateRefreshTokenMock = vi.spyOn(
                authService,
                'generateRefreshToken' as keyof AuthService
            );

            // 2. Act------------------------------------------------------------------------------
            await expect(
                authService.login(loginData, clientDetails)
            ).rejects.toThrowError(dbError);

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the prisma user.findUnique is invoked with correct args.
            expect(prismaMock.user.findUnique).toBeCalledTimes(1);
            expect(prismaMock.user.findUnique).toBeCalledWith({
                where: {
                    username: loginData.username,
                },
            });

            // Assert that bcrypt.compare is not invoked.
            expect(bcrypt.compare).toBeCalledTimes(0);

            // Assert that bcrypt.hash is not invoked.
            expect(bcrypt.hash).toBeCalledTimes(0);

            // Assert that the access and refresh token generator functions are not called.
            expect(generateAccessTokenMock).toBeCalledTimes(0);
            expect(generateRefreshTokenMock).toBeCalledTimes(0);

            // Assert that the refresh token entry is not added in db.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(0);
        });

        it('should throw an error if database call to add new refresh token entry fails', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const loginData: LoginRequestDto = {
                username: 'blue0206',
                password: 'Password@1234',
            };
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };
            const mockUser: User = {
                id: 1,
                username: 'blue0206',
                firstName: 'Blue',
                avatar: 'mock-avatar-public-id',
                role: 'USER',
                password: 'hashed-pass',
                createdAt: MOCK_DATE,
                updatedAt: MOCK_DATE,
                lastActive: MOCK_DATE,
                middleName: null,
                lastName: null,
            };
            const dbError = new Error(
                'Refresh token entry creation in database failed.'
            );

            prismaErrorHandlerMock.mockImplementation(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );
            prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
            prismaMock.refreshToken.create.mockRejectedValueOnce(dbError);

            vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
            vi.mocked(bcrypt.hash).mockResolvedValueOnce(
                'hashed-refresh-token' as never
            );

            mapPrismaRoleToEnumRoleMock.mockReturnValueOnce(mockUser.role);

            getRefreshTokenExpiryDateMock.mockReturnValueOnce(MOCK_DATE);

            const generateAccessTokenMock = vi
                .spyOn(authService, 'generateAccessToken' as keyof AuthService)
                .mockReturnValueOnce('mock-access-token' as never);
            const generateRefreshTokenMock = vi
                .spyOn(authService, 'generateRefreshToken' as keyof AuthService)
                .mockReturnValueOnce('mock-refresh-token' as never);

            // 2. Act------------------------------------------------------------------------------
            await expect(
                authService.login(loginData, clientDetails)
            ).rejects.toThrowError(dbError);

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(2);

            // Assert that the prisma user.findUnique is invoked with correct args.
            expect(prismaMock.user.findUnique).toBeCalledTimes(1);
            expect(prismaMock.user.findUnique).toBeCalledWith({
                where: {
                    username: loginData.username,
                },
            });

            // Assert that bcrypt.compare is invoked with correct args.
            expect(bcrypt.compare).toBeCalledTimes(1);
            expect(bcrypt.compare).toBeCalledWith(
                loginData.password,
                mockUser.password
            );

            // Assert that bcrypt.hash is invoked with correct args.
            expect(bcrypt.hash).toBeCalledTimes(1);
            expect(bcrypt.hash).toBeCalledWith(
                'mock-refresh-token',
                config.SALT_ROUNDS
            );

            // Assert that the access and refresh token generator functions are called correctly.
            expect(generateAccessTokenMock).toBeCalledTimes(1);
            expect(generateAccessTokenMock).toBeCalledWith({
                id: mockUser.id,
                username: mockUser.username,
                role: mockUser.role,
            });
            expect(generateRefreshTokenMock).toBeCalledTimes(1);
            expect(generateRefreshTokenMock).toBeCalledWith(
                {
                    id: mockUser.id,
                },
                'uuidv4'
            );

            // Assert that the prisma refreshToken.create is invoked with correct args.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.create).toBeCalledWith({
                data: {
                    jwtId: 'uuidv4',
                    userId: mockUser.id,
                    tokenHash: 'hashed-refresh-token',
                    expiresAt: MOCK_DATE,
                    ip: clientDetails.ip,
                    location: clientDetails.location,
                    userAgent: clientDetails.userAgent,
                },
            });
        });
    });

    describe('logout', () => {
        let authService: AuthService;

        beforeEach(() => {
            authService = new AuthService();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should successfully logout the user by verifying and validating refresh token and revoking its entry in the database', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const refreshToken = 'mock-refresh-token';

            jwtErrorHandlerMock.mockImplementationOnce(
                <TokenType extends AccessTokenPayload | RefreshTokenPayload>(
                    verifyJwt: () => TokenType
                ): TokenType => {
                    return verifyJwt();
                }
            );

            vi.mocked(jwt.verify).mockReturnValueOnce({
                id: 1,
                jti: 'uuidv4',
            } as never);

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );

            // 2. Act------------------------------------------------------------------------------
            await expect(authService.logout(refreshToken)).resolves.toBeUndefined();

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that jwtErrorHandler wrapper is invoked.
            expect(jwtErrorHandlerMock).toBeCalledTimes(1);

            // Assert that the prisma.refreshToken.delete is invoked with correct args.
            expect(prismaMock.refreshToken.delete).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.delete).toBeCalledWith({
                where: {
                    userId: 1,
                    jwtId: 'uuidv4',
                },
            });

            // Assert that jwt.verify is invoked with correct args.
            expect(jwt.verify).toBeCalledTimes(1);
            expect(jwt.verify).toBeCalledWith(
                refreshToken,
                config.REFRESH_TOKEN_SECRET
            );
        });

        it('should throw error on validation failure of refresh token payload', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const refreshToken = 'mock-refresh-token';

            jwtErrorHandlerMock.mockImplementationOnce(
                <TokenType extends AccessTokenPayload | RefreshTokenPayload>(
                    verifyJwt: () => TokenType
                ): TokenType => {
                    return verifyJwt();
                }
            );

            vi.mocked(jwt.verify).mockReturnValueOnce({
                id: '1', // Should be a number.
                jti: 1, // Should be a string.
            } as never);

            // 2. Act------------------------------------------------------------------------------
            await expect(authService.logout(refreshToken)).rejects.instanceOf(
                ZodError
            );

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is not invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(0);

            // Assert that jwtErrorHandler wrapper is invoked.
            expect(jwtErrorHandlerMock).toBeCalledTimes(1);

            // Assert that jwt.verify is invoked with correct args.
            expect(jwt.verify).toBeCalledTimes(1);
            expect(jwt.verify).toBeCalledWith(
                refreshToken,
                config.REFRESH_TOKEN_SECRET
            );

            // Assert that the prisma.refreshToken.delete is not invoked.
            expect(prismaMock.refreshToken.delete).toBeCalledTimes(0);
        });

        it('should throw error on failed token verification', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const refreshToken = 'mock-refresh-token';
            const jwtError = new Error('JWT verification failed.');

            jwtErrorHandlerMock.mockImplementationOnce(
                <TokenType extends AccessTokenPayload | RefreshTokenPayload>(
                    verifyJwt: () => TokenType
                ): TokenType => {
                    return verifyJwt();
                }
            );

            vi.mocked(jwt.verify).mockImplementationOnce(() => {
                throw jwtError;
            });

            // 2. Act------------------------------------------------------------------------------
            await expect(authService.logout(refreshToken)).rejects.toThrowError(
                jwtError
            );

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is not invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(0);

            // Assert that jwtErrorHandler wrapper is invoked.
            expect(jwtErrorHandlerMock).toBeCalledTimes(1);

            // Assert that jwt.verify is invoked with correct args.
            expect(jwt.verify).toBeCalledTimes(1);
            expect(jwt.verify).toBeCalledWith(
                refreshToken,
                config.REFRESH_TOKEN_SECRET
            );

            // Assert that the prisma.refreshToken.delete is not invoked.
            expect(prismaMock.refreshToken.delete).toBeCalledTimes(0);
        });

        it('should throw error on failed database call', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const refreshToken = 'mock-refresh-token';
            const dbError = new Error('Database call failed.');

            jwtErrorHandlerMock.mockImplementationOnce(
                <TokenType extends AccessTokenPayload | RefreshTokenPayload>(
                    verifyJwt: () => TokenType
                ): TokenType => {
                    return verifyJwt();
                }
            );

            vi.mocked(jwt.verify).mockReturnValueOnce({
                id: 1,
                jti: 'uuidv4',
            } as never);

            prismaErrorHandlerMock.mockImplementationOnce(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );

            prismaMock.refreshToken.delete.mockRejectedValueOnce(dbError);

            // 2. Act------------------------------------------------------------------------------
            await expect(authService.logout(refreshToken)).rejects.toThrowError(
                dbError
            );

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(1);

            // Assert that jwtErrorHandler wrapper is invoked.
            expect(jwtErrorHandlerMock).toBeCalledTimes(1);

            // Assert that jwt.verify is invoked with correct args.
            expect(jwt.verify).toBeCalledTimes(1);
            expect(jwt.verify).toBeCalledWith(
                refreshToken,
                config.REFRESH_TOKEN_SECRET
            );

            // Assert that the prisma.refreshToken.delete is invoked with correct args.
            expect(prismaMock.refreshToken.delete).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.delete).toBeCalledWith({
                where: {
                    userId: 1,
                    jwtId: 'uuidv4',
                },
            });
        });
    });

    describe('refresh', () => {
        let authService: AuthService;

        beforeEach(() => {
            authService = new AuthService();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should successfully return user data with refreshed tokens after verifying and validating the old refresh token', async () => {
            // 1. Arrange--------------------------------------------------------------------------------
            const refreshToken = 'mock-refresh-token';
            const mockRefreshTokenPayload: RefreshTokenPayload = {
                id: 1,
                jti: 'uuidv4-current',
            };
            const clientDetails: ClientDetailsType = {
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
            };
            const mockRefreshTokenEntry: RefreshToken = {
                jwtId: 'uuidv4-current',
                succeedsJwtId: 'uuidv4-old',
                createdAt: MOCK_DATE,
                expiresAt: MOCK_DATE,
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
                tokenHash: 'hashed-refresh-token-old',
                userId: 1,
            };
            const mockUser: Omit<User, 'password'> = {
                id: 1,
                username: 'blue0206',
                firstName: 'Blue',
                avatar: 'mock-avatar-public-id',
                role: 'USER',
                createdAt: MOCK_DATE,
                updatedAt: MOCK_DATE,
                lastActive: MOCK_DATE,
                middleName: null,
                lastName: null,
            };

            jwtErrorHandlerMock.mockImplementationOnce(
                <TokenType extends AccessTokenPayload | RefreshTokenPayload>(
                    verifyJwt: () => TokenType
                ): TokenType => {
                    return verifyJwt();
                }
            );

            vi.mocked(jwt.verify).mockReturnValueOnce(
                mockRefreshTokenPayload as never
            );

            prismaErrorHandlerMock.mockImplementation(
                async <QueryReturnType>(
                    queryFn: () => Promise<QueryReturnType>
                ): Promise<QueryReturnType> => {
                    return await queryFn();
                }
            );

            prismaMock.refreshToken.findUnique.mockResolvedValueOnce({
                jwtId: 'uuidv4',
                succeedsJwtId: null,
                createdAt: MOCK_DATE,
                expiresAt: MOCK_DATE,
                ip: '127.0.0.1',
                userAgent: 'Chrome',
                location: 'home',
                tokenHash: 'hashed-refresh-token',
                userId: 1,
            });

            mapPrismaRoleToEnumRoleMock.mockReturnValueOnce(mockUser.role as Role);

            getRefreshTokenExpiryDateMock.mockReturnValueOnce(MOCK_DATE);

            vi.mocked(bcrypt.hash).mockResolvedValueOnce(
                'hashed-refresh-token' as never
            );

            const generateAccessTokenMock = vi
                .spyOn(authService, 'generateAccessToken' as keyof AuthService)
                .mockReturnValueOnce('mock-access-token' as never);

            const generateRefreshTokenMock = vi
                .spyOn(authService, 'generateRefreshToken' as keyof AuthService)
                .mockReturnValueOnce('mock-refresh-token' as never);

            prismaMock.$transaction.mockImplementationOnce(async (callback) => {
                return await callback(prismaMock);
            });

            prismaMock.refreshToken.create.mockResolvedValueOnce({} as RefreshToken);

            prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as User);

            // 2. Act------------------------------------------------------------------------------
            const result = await authService.refresh(refreshToken, clientDetails);

            // 3. Assert--------------------------------------------------------------------------------
            // Assert that prismaErrorHandler wrapper is invoked.
            expect(prismaErrorHandlerMock).toBeCalledTimes(2);

            // Assert that prisma.$transaction is invoked.
            expect(prismaMock.$transaction).toBeCalledTimes(1);

            // Assert that jwtErrorHandler wrapper is invoked.
            expect(jwtErrorHandlerMock).toBeCalledTimes(1);

            // Assert that jwt.verify is invoked with correct args.
            expect(jwt.verify).toBeCalledTimes(1);
            expect(jwt.verify).toBeCalledWith(
                refreshToken,
                config.REFRESH_TOKEN_SECRET
            );

            // Assert that the prisma.refreshToken.findUnique is invoked with correct args.
            expect(prismaMock.refreshToken.findUnique).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.findUnique).toBeCalledWith({
                where: {
                    userId: mockUser.id,
                    jwtId: mockRefreshTokenPayload.jti,
                },
            });

            // Assert that bcrypt.hash is invoked with correct args.
            expect(bcrypt.hash).toBeCalledTimes(1);
            expect(bcrypt.hash).toBeCalledWith(
                'mock-refresh-token',
                config.SALT_ROUNDS
            );

            // Assert that the token generator functions are called correctly.
            expect(generateAccessTokenMock).toBeCalledTimes(1);
            expect(generateAccessTokenMock).toBeCalledWith({
                id: mockUser.id,
                username: mockUser.username,
                role: mockUser.role,
            });
            expect(generateRefreshTokenMock).toBeCalledTimes(1);
            expect(generateRefreshTokenMock).toBeCalledWith(
                {
                    id: mockUser.id,
                },
                'uuidv4'
            );

            // Assert that token is created in DB.
            expect(prismaMock.refreshToken.create).toBeCalledTimes(1);
            expect(prismaMock.refreshToken.create).toBeCalledWith({
                data: {
                    userId: mockUser.id,
                    jwtId: 'uuidv4',
                    tokenHash: 'hashed-refresh-token',
                    expiresAt: MOCK_DATE,
                    ip: clientDetails.ip,
                    location: clientDetails.location,
                    userAgent: clientDetails.userAgent,
                    succeedsJwtId: mockRefreshTokenEntry.jwtId,
                },
            });

            // Assert that the mapPrismaRoleToEnumRole utility is invoked with correct args.
            expect(mapPrismaRoleToEnumRoleMock).toBeCalledTimes(1);
            expect(mapPrismaRoleToEnumRoleMock).toBeCalledWith(mockUser.role);

            // Assert that the getRefreshTokenExpiryDate utility is invoked.
            expect(getRefreshTokenExpiryDateMock).toBeCalledTimes(1);

            // Assert that the prisma user.findUnique is invoked with correct args.
            expect(prismaMock.user.findUnique).toBeCalledTimes(1);
            expect(prismaMock.user.findUnique).toBeCalledWith({
                where: {
                    id: mockRefreshTokenPayload.id,
                },
                omit: {
                    password: true,
                },
            });

            // Assert that user data and new tokens are returned by the method.
            expect(result).toStrictEqual({
                ...mockUser,
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
            } satisfies RefreshServiceReturnType);
        });
    });
});
