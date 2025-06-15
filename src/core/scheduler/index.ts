import cron from 'node-cron';
import clearExpiredTokens from './clearExpiredTokens.js';
import batchUpdateLastActive from './batchUpdateLastActive.js';

export const clearExpiredRefreshTokensTask = cron.schedule(
    '0 0 * * *',
    clearExpiredTokens,
    {
        name: 'Clear_Expired_Refresh_Tokens',
    }
);

export const lastActiveDataFlushTask = cron.schedule(
    '0 * * * *',
    batchUpdateLastActive,
    {
        name: 'User_Activity_Batch_Update',
    }
);
