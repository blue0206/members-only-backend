import multer, { MulterError } from 'multer';
import type { Request, Response, NextFunction } from 'express';
import {
    AvatarSchema,
    ErrorCodes,
    supportedImageFormats,
} from '@blue0206/members-only-shared-types';
import type {
    ApiErrorCode,
    SupportedImageFormatsType,
} from '@blue0206/members-only-shared-types';
import { BadRequestError, ValidationError } from '../errors/customErrors.js';

// Setup multer memory storage.
const storage = multer.memoryStorage();

// Configure multer upload middleware with validation.
const upload = multer({
    storage,
    limits: {
        fields: 8,
        files: 1,
        fileSize: 8000000,
        parts: 8,
    },
    fileFilter: (_req, file, cb) => {
        // Initialize error code as VALIDATION_ERROR.
        let errorCode: ApiErrorCode = ErrorCodes.VALIDATION_ERROR;

        // Check if the image type is supported. If not, update error code to FILE_TYPE_NOT_SUPPORTED.
        if (
            !supportedImageFormats.includes(
                file.mimetype as SupportedImageFormatsType
            )
        ) {
            errorCode = ErrorCodes.FILE_TYPE_NOT_SUPPORTED;
        }

        // Check if the image size is too large. If so, update error code to FILE_TOO_LARGE.
        if (file.size > 8000000) {
            errorCode = ErrorCodes.FILE_TOO_LARGE;
        }

        // Parse the file against schema.
        const parsedFile = AvatarSchema.safeParse(file);

        // Send error if validation fails.
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

        // If validation passes, accept the file.
        cb(null, true);
    },
});

// Create a wrapper around multer upload middleware
// to invoke inside our main middleware.
const uploadHandler = upload.fields([
    {
        name: 'avatar',
        maxCount: 1,
    },
    {
        name: 'newAvatar',
        maxCount: 1,
    },
]);

// Main middleware, handles file upload and errors.
export default function multerMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    void uploadHandler(req, res, (err: unknown) => {
        if (err) {
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
                    // Send multer error message as-is for other errors.
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
        next();
    });
}
