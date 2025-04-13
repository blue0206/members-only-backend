import { authService } from './auth.service.js';
import { RegisterRequestSchema } from '@blue0206/members-only-shared-types';
import { mapToRegisterResponseDto } from './auth.mapper.js';
import type { Request, Response } from 'express';
import type {
    RegisterRequestDto,
    RegisterResponseDto,
} from '@blue0206/members-only-shared-types';
import type { RegisterServiceReturnType } from './auth.types.js';

export const registerUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    // Validate the incoming request to make sure it adheres to the
    // API contract (RegisterRequestDto).
    const parsedBody = RegisterRequestSchema.safeParse(req.body);
    // Throw Error if validation fails.
    // TODO: Implement proper error handling.
    if (!parsedBody.success) {
        throw new Error('Parse failed.');
    }
    // Extract the RegisterRequestDto object from the parsedBody
    // and pass it to the service layer.
    const registerData: RegisterRequestDto = parsedBody.data;
    const userData: RegisterServiceReturnType =
        await authService.register(registerData);
    // Map the data returned by the service layer to the RegisterResponseDto
    // to adhere to API contract.
    const responseData: RegisterResponseDto =
        mapToRegisterResponseDto(userData);
    // Return response.
    // TODO: Implement proper API Response wrapper.
    res.status(201).json(responseData);
};
