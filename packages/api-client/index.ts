import axios, { type AxiosInstance } from 'axios';

const DEFAULT_API_URL = 'http://localhost:3000/api';
const DEFAULT_LOGIN_PATH = '/login';
const DEFAULT_TOKEN_KEY = 'token';
const DEFAULT_REFRESH_TOKEN_KEY = 'refresh_token';

type BrowserAuthOptions = {
    loginPath?: string;
    tokenKey?: string;
    refreshTokenKey?: string;
};

export function getApiBaseUrl(explicitBaseUrl?: string) {
    return explicitBaseUrl || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function createApiClient(explicitBaseUrl?: string) {
    return axios.create({
        baseURL: getApiBaseUrl(explicitBaseUrl),
        headers: {},
    });
}

export function attachBrowserAuth(
    client: AxiosInstance,
    explicitBaseUrl?: string,
    options: BrowserAuthOptions = {},
) {
    const {
        loginPath = DEFAULT_LOGIN_PATH,
        tokenKey = DEFAULT_TOKEN_KEY,
        refreshTokenKey = DEFAULT_REFRESH_TOKEN_KEY,
    } = options;

    let refreshPromise: Promise<string | null> | null = null;
    const apiBaseUrl = getApiBaseUrl(explicitBaseUrl);

    const refreshAccessToken = async () => {
        if (typeof window === 'undefined') {
            return null;
        }

        const refreshToken = window.localStorage.getItem(refreshTokenKey);
        if (!refreshToken) {
            return null;
        }

        const response = await axios.post(`${apiBaseUrl}/auth/refresh`, {
            refresh_token: refreshToken,
        });
        const {
            accessToken,
            refreshToken: rotatedRefreshToken,
        } = response.data || {};

        if (accessToken) {
            window.localStorage.setItem(tokenKey, accessToken);
        }
        if (rotatedRefreshToken) {
            window.localStorage.setItem(refreshTokenKey, rotatedRefreshToken);
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

    client.interceptors.request.use((config) => {
        const token = typeof window !== 'undefined'
            ? window.localStorage.getItem(tokenKey)
            : null;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    });

    client.interceptors.response.use(
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
                        return client(originalRequest);
                    }
                } catch (_refreshError) {
                    // Fall through to logout behavior.
                }

                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(tokenKey);
                    window.localStorage.removeItem(refreshTokenKey);
                    window.location.href = loginPath;
                }
            }

            return Promise.reject(error);
        },
    );

    return client;
}

export function createBrowserApiClient(
    explicitBaseUrl?: string,
    options: BrowserAuthOptions = {},
) {
    const client = createApiClient(explicitBaseUrl);
    return attachBrowserAuth(client, explicitBaseUrl, options);
}
