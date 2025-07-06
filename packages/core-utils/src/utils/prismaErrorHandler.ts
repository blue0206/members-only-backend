import { Prisma } from '@members-only/database';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import {
    AppError,
    BadRequestError,
    ConflictError,
    InternalServerError,
    NotFoundError,
} from '../errors/customErrors.js';
import type { Logger } from 'pino';

// This is a wrapper function for all the prisma DB calls in order to
// handle prisma-specific errors.
export async function prismaErrorHandler<QueryReturnType>(
    queryFn: () => Promise<QueryReturnType>,
    log: Logger
): Promise<QueryReturnType> {
    try {
        const queryResult: QueryReturnType = await queryFn();
        return queryResult;
    } catch (error) {
        log.error({ err: error }, 'Prisma error caught.');

        // Handle different instances of Prisma Error.
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            switch (error.code) {
                case 'P2000': {
                    const target = error.message.split('Column: ')[1];
                    const message = target
                        ? `Value too long for the field(s): ${target}`
                        : 'Value too long';
                    throw new BadRequestError(message, ErrorCodes.VALUE_TOO_LONG);
                }
                case 'P2015':
                case 'P2025':
                case 'P2001': {
                    const record = error.message.split('.')[1].split('=')[0];
                    const message = error.message.includes('=')
                        ? `The column ${record} does not exist in database.`
                        : 'The record does not exist.';
                    throw new NotFoundError(message);
                }
                case 'P2002': {
                    const target = (error.meta?.target as string[]).join(', ') || '';
                    const message = target
                        ? `Value already exists for unique field: ${target}.`
                        : 'Value already exists';
                    throw new ConflictError(
                        message,
                        ErrorCodes.UNIQUE_CONSTRAINT_VIOLATION
                    );
                }
                case 'P2003': {
                    throw new BadRequestError(
                        error.message,
                        ErrorCodes.FOREIGN_KEY_VIOLATION
                    );
                }
                case 'P2005':
                case 'P2006': {
                    // Make sure the value you input does not contain the word "field" for this to work.
                    const field = error.message.split('field')[1].split(' ')[0];
                    throw new BadRequestError(
                        `Invalid value provided for the field: ${field || 'unknown'}.`,
                        ErrorCodes.INVALID_VALUE
                    );
                }
                case 'P2013':
                    throw new BadRequestError(
                        `Missing required argument.`,
                        ErrorCodes.REQUIRED_CONSTRAINT_VIOLATION
                    );
                case 'P2014': {
                    throw new BadRequestError(
                        `Required relation violation.`,
                        ErrorCodes.REQUIRED_CONSTRAINT_VIOLATION
                    );
                }
                case 'P2020': {
                    throw new BadRequestError(
                        `Value out of range.`,
                        ErrorCodes.RANGE_ERROR
                    );
                }
                default: {
                    throw new InternalServerError(
                        `Database request failed (Code: ${error.code}).`,
                        ErrorCodes.DATABASE_ERROR,
                        error.message
                    );
                }
            }
        } else if (error instanceof Prisma.PrismaClientValidationError) {
            throw new BadRequestError(
                'Database validation failed. Invalid data provided to query.',
                ErrorCodes.DATABASE_VALIDATION_ERROR,
                error.message
            );
        } else if (error instanceof Prisma.PrismaClientInitializationError) {
            throw new AppError(
                'Database connection error.',
                503,
                ErrorCodes.DATABASE_CONNECTION_ERROR,
                error.message
            );
        } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
            throw new InternalServerError(
                'Unknown database error occurred.',
                ErrorCodes.DATABASE_ERROR,
                error.message
            );
        } else if (error instanceof Prisma.PrismaClientRustPanicError) {
            throw new InternalServerError(
                'Internal database engine error.',
                ErrorCodes.INTERNAL_SERVER_ERROR,
                error.message
            );
        } else {
            // If none of the above, bubble it up and handle it in the error-middleware.
            throw error;
        }
    }
}
