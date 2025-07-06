import multer, { MulterError } from 'multer';
import {
    AvatarSchema,
    ErrorCodes,
    supportedImageFormats,
} from '@blue0206/members-only-shared-types';
import { BadRequestError, ValidationError } from '../errors/customErrors.js';
import type { Request, Response, NextFunction } from 'express';
import type {
    ApiErrorCode,
    SupportedImageFormatsType,
} from '@blue0206/members-only-shared-types';

// Setup multer memory storage.
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fields: 8,
        files: 1,
        fileSize: 8000000,
        parts: 8,
    },
    fileFilter: (_req, file, cb) => {
        let errorCode: ApiErrorCode = ErrorCodes.VALIDATION_ERROR;

        if (
            !supportedImageFormats.includes(
                file.mimetype as SupportedImageFormatsType
            )
        ) {
            errorCode = ErrorCodes.FILE_TYPE_NOT_SUPPORTED;
        }

        if (file.size > 8000000) {
            errorCode = ErrorCodes.FILE_TOO_LARGE;
        }

        const parsedFile = AvatarSchema.safeParse(file);

        if (!parsedFile.success) {
            cb(
                new ValidationError(
                    'File upload validation failed.',
                    errorCode,
                    parsedFile.error.flatten()
                )
            );
            return;
        }

        cb(null, true);
    },
});

// A wrapper around multer upload middleware
// to invoke inside our main middleware.
const uploadHandler = upload.single('avatar');

// Main middleware; handles file upload and errors.
export function multerMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    req.log.debug('Multer middleware invoked.');
    void uploadHandler(req, res, (err: unknown) => {
        if (err) {
            req.log.error({ err }, 'Error occurred in multer middleware.');

            if (err instanceof MulterError) {
                switch (err.code) {
                    // Handle file size error separately.
                    case 'LIMIT_FILE_SIZE':
                        next(
                            new BadRequestError(
                                'The file exceeds size limit.',
                                ErrorCodes.FILE_TOO_LARGE
                            )
                        );
                        break;
                    // Send multer error message as-is for all other errors.
                    default:
                        next(
                            new BadRequestError(
                                err.message,
                                ErrorCodes.FILE_UPLOAD_ERROR
                            )
                        );
                }
                return;
            } else if (err instanceof ValidationError) {
                // The error is already formatted, forward it.
                next(err);
                return;
            }
            // Unknown error, handle in error middleware.
            next(err);
            return;
        }
        req.log.debug('Multer file upload successful.');
        next();
    });
}
