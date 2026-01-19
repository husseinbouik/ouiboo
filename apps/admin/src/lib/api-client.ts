import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {},
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async () => {
    if (typeof window === 'undefined') {
        return null;
    }
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        return null;
    }
    const response = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
    const { accessToken, refreshToken: rotatedRefreshToken } = response.data || {};
    if (accessToken) {
        localStorage.setItem('token', accessToken);
    }
    if (rotatedRefreshToken) {
        localStorage.setItem('refresh_token', rotatedRefreshToken);
    }
    return accessToken || null;
};

const getRefreshedToken = async () => {
    if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest?._retry) {
            originalRequest._retry = true;
            try {
                const newToken = await getRefreshedToken();
                if (newToken) {
                    originalRequest.headers = {
                        ...(originalRequest.headers || {}),
                        Authorization: `Bearer ${newToken}`,
                    };
                    return apiClient(originalRequest);
                }
            } catch (_error) {
                // fall through to logout
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
