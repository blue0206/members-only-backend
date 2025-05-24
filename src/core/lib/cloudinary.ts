import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../logger.js';
import { InternalServerError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { UploadApiResponse } from 'cloudinary';

cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
});

// Upload a buffer file to Cloudinary, returns public_id of uploaded file.
export const uploadFile = async (
    file: Buffer,
    username: string
): Promise<string> => {
    logger.info({ username }, 'Uploading file to Cloudinary.');

    const uploadPromise: Promise<UploadApiResponse> = new Promise<UploadApiResponse>(
        (resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    {
                        overwrite: true, // Replaces the file if already existing (matching the public_id).
                        resource_type: 'auto',
                        public_id: `avatar/${username}`, // Allows us to replace avatar in case user changes their avatar.
                        // Fixes deferred promise rejection from Cloudinary SDK which causes app to crash if global
                        // unhandledRejection is setup. This is because SDK uses Q.defer() to defer the promise resolve/rejection.
                        // https://github.com/cloudinary/cloudinary_npm/issues/215
                        disable_promises: true,
                    },
                    (err, result) => {
                        if (err) {
                            reject(
                                new InternalServerError(
                                    'File upload to Cloudinary failed.',
                                    ErrorCodes.FILE_UPLOAD_ERROR,
                                    err
                                )
                            );
                            return;
                        }
                        if (!result) {
                            reject(
                                new InternalServerError(
                                    'File upload to Cloudinary failed.'
                                )
                            );
                            return;
                        }

                        resolve(result);
                    }
                )
                .end(file);
        }
    );

    const result: UploadApiResponse = await uploadPromise;
    logger.info(
        { avatarId: result, format: result.format, size: result.bytes },
        'File uploaded to Cloudinary successfully.'
    );

    return result.public_id;
};

export const deleteFile = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        logger.error({ error }, 'Error deleting file from Cloudinary.');

        throw new InternalServerError(
            'File deletion from Cloudinary failed.',
            ErrorCodes.FILE_DELETE_ERROR,
            error
        );
    }
};

// Return avatar url after performing transformations and optimization.
export const getAvatarUrl = (publicId: string): string => {
    return cloudinary.url(publicId, {
        // Optimizations
        fetch_format: 'auto',
        quality: 'auto',
        // Transformations
        width: 150,
        height: 150,
        crop: 'fill',
        radius: 'max',
        dpr: 'auto',
    });
};
