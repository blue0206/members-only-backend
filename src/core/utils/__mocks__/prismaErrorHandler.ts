import { vi } from 'vitest';

export const prismaErrorHandler = vi
    .fn()
    .mockImplementation(
        async <QueryReturnType>(
            queryFn: () => Promise<QueryReturnType>
        ): Promise<QueryReturnType> => {
            return await queryFn();
        }
    );
