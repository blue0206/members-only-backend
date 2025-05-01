import { InternalServerError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { ZodSchema } from 'zod';

/**
 * Validates a mapped DTO against a schema.
 *
 * @param {unknown} data - The data to validate.
 * @param {ZodSchema<DTO>} schema - The schema to validate against.
 * @returns {DTO} The validated data.
 * @throws {InternalServerError} If parsing fails.
 */
const mappedDtoValidator = <DTO>(data: unknown, schema: ZodSchema<DTO>): DTO => {
    // Parse mapped data against schema.
    const parsedData = schema.safeParse(data);
    // Throw error if parsing fails.
    if (!parsedData.success) {
        throw new InternalServerError(
            'DTO Mapping Error',
            ErrorCodes.INTERNAL_SERVER_ERROR,
            parsedData.error.flatten()
        );
    }
    // Return mapped, parsed data.
    return parsedData.data;
};

export default mappedDtoValidator;
