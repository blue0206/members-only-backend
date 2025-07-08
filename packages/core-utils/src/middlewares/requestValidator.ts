import { ZodError } from 'zod';
import { ValidationError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types/api/error-codes';
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

interface BodyArg {
    schema: ZodSchema;
    type: 'body';
}
interface ParamsArg {
    schema: ZodSchema;
    type: 'params';
}
interface QueryArg {
    schema: ZodSchema;
    type: 'query';
}

export type RequestValidatorArgsType =
    | [BodyArg]
    | [ParamsArg]
    | [QueryArg]
    | [BodyArg, ParamsArg]
    | [BodyArg, QueryArg]
    | [ParamsArg, QueryArg]
    | [BodyArg, ParamsArg, QueryArg];

export const requestValidator =
    (...args: RequestValidatorArgsType) =>
    async (
        req: Request<unknown, unknown, unknown, unknown>,
        _res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            for (const arg of args) {
                switch (arg.type) {
                    case 'body': {
                        req.body = await arg.schema.parseAsync(req.body);
                        req.log.info('Request body validated.');
                        break;
                    }
                    case 'params': {
                        await arg.schema.parseAsync(req.params);

                        req.log.info('Request params validated.');
                        break;
                    }
                    case 'query': {
                        await arg.schema.parseAsync(req.query);

                        req.log.info('Request query validated.');
                        break;
                    }
                }
            }
            next();
        } catch (error) {
            req.log.error({ error }, 'Error validating request.');

            if (error instanceof ZodError) {
                throw new ValidationError(
                    'Invalid request.',
                    ErrorCodes.VALIDATION_ERROR,
                    error.flatten()
                );
            }

            next(error);
        }
    };
