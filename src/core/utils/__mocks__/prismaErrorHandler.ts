import { vi } from 'vitest';

const prismaErrorHandler = vi
    .fn()
    .mockImplementation(
        async <QueryReturnType>(
            queryFn: () => Promise<QueryReturnType>
        ): Promise<QueryReturnType> => {
            return await queryFn();
        }
    );

export default prismaErrorHandler;
