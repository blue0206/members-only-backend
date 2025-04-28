import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../logger.js';
import { InternalServerError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';

// Configure Cloudinary.
cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
});

// Upload a buffer file to Cloudinary.
export const uploadFile = (file: Buffer, username: string): Promise<string> => {
    logger.info({ username }, 'Uploading file to Cloudinary.');
    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                {
                    overwrite: true,
                    format: 'auto',
                    public_id: `avatar/${username}`, // Allows us to replace avatar in case user changes their avatar.
                },
                (err, result) => {
                    if (err) {
                        // Log the error and reject with a custom error.
                        logger.error(
                            { error: err },
                            'Error uploading file to Cloudinary.'
                        );
                        reject(
                            new InternalServerError(
                                'File upload to Cloudinary failed.',
                                ErrorCodes.FILE_UPLOAD_ERROR,
                                err
                            )
                        );
                        return;
                    }
                    // Just serves as a dummy check for TS to recognize result as defined.
                    if (!result) {
                        reject(
                            new InternalServerError(
                                'File upload to Cloudinary failed.'
                            )
                        );
                        return;
                    }
                    logger.info(
                        { avatarId: result.public_id },
                        'File uploaded to Cloudinary successfully.'
                    );
                    // Resolve with the public ID of the uploaded file.
                    resolve(result.public_id);
                }
            )
            .end(file);
    });
};
