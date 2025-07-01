import { ZodError } from 'zod';
import type { ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { logger } from '../logger.js';

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

type RequestValidatorArgsType =
    | [BodyArg]
    | [ParamsArg]
    | [QueryArg]
    | [BodyArg, ParamsArg]
    | [BodyArg, QueryArg]
    | [ParamsArg, QueryArg]
    | [BodyArg, ParamsArg, QueryArg];

// Since params/query types for messageId and userId are coerced to number by zod schema,
// they are handled inside controllers.
const requestValidator =
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
                        logger.info('Request body validated.');
                        break;
                    }
                    case 'params': {
                        if (
                            req.params &&
                            typeof req.params === 'object' &&
                            ('messageId' in req.params || 'userId' in req.params)
                        ) {
                            break;
                        }
                        req.params = await arg.schema.parseAsync(req.params);
                        logger.info('Request params validated.');
                        break;
                    }
                    case 'query': {
                        if (
                            req.query &&
                            typeof req.query === 'object' &&
                            ('messageId' in req.query || 'userId' in req.query)
                        ) {
                            break;
                        }
                        req.query = await arg.schema.parseAsync(req.query);
                        logger.info('Request query validated.');
                        break;
                    }
                }
            }
            next();
        } catch (error) {
            logger.error({ error }, 'Error validating request.');

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

export default requestValidator;
