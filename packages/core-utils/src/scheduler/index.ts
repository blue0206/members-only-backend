import cron from 'node-cron';
import clearExpiredTokens from './clearExpiredTokens.js';

export const clearExpiredRefreshTokensTask = cron.schedule(
    '0 0/4 * * *',
    clearExpiredTokens,
    {
        name: 'Clear_Expired_Refresh_Tokens',
    }
);
