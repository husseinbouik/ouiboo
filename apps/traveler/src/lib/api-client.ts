import { createBrowserApiClient } from '@ouiboo/api-client';

export const apiClient = createBrowserApiClient(
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
);

