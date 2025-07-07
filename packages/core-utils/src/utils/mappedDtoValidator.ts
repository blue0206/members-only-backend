import { InternalServerError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types/api/error-codes';
import type { ZodSchema } from 'zod';

/**
 * Validates a mapped DTO against a schema.
 *
 * @param {unknown} data - The data to validate.
 * @param {ZodSchema<DTO>} schema - The schema to validate against.
 * @returns {DTO} The validated data.
 * @throws {InternalServerError} If parsing fails.
 */
export const mappedDtoValidator = <DTO>(
    data: unknown,
    schema: ZodSchema<DTO>
): DTO => {
    const parsedData = schema.safeParse(data);
    if (!parsedData.success) {
        throw new InternalServerError(
            'DTO Mapping Error',
            ErrorCodes.INTERNAL_SERVER_ERROR,
            parsedData.error.flatten()
        );
    }
    return parsedData.data;
};
