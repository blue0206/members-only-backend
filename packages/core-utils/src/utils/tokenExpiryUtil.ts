import { config } from '../config/index.js';
import ms from 'ms';
import type { StringValue } from 'ms';

export function getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + ms(config.REFRESH_TOKEN_EXPIRY as StringValue));
}
