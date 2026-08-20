import axios, {
  type AxiosInstance,
  type AxiosResponse,
} from 'axios'

const DEFAULT_API_URL = 'http://localhost:3000/api/v1'
const DEFAULT_LOGIN_PATH = '/login'
const DEFAULT_TOKEN_KEY = 'token'
const DEFAULT_REFRESH_TOKEN_KEY = 'refresh_token'

export interface BrowserAuthOptions {
  loginPath?: string
  tokenKey?: string
  refreshTokenKey?: string
}

type ApiEnvelopeBody = {
  success: true
  data: unknown
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  timestamp: string
}

const isApiEnvelope = (value: unknown): value is ApiEnvelopeBody => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.success === true &&
    'data' in candidate &&
    typeof candidate.timestamp === 'string'
  )
}

/**
 * Maintains the pre-envelope response shape while applications migrate to the
 * typed SDK. Paginated endpoints retain `{ data, pagination }`; other endpoints
 * expose their payload directly as `response.data`.
 */
export function unwrapApiEnvelope(response: AxiosResponse) {
  if (!isApiEnvelope(response.data)) return response

  response.data = response.data.meta
    ? { data: response.data.data, pagination: response.data.meta }
    : response.data.data
  return response
}

export function normalizeApiProblem(error: unknown) {
  if (!error || typeof error !== 'object') return error
  const candidate = error as {
    response?: { data?: Record<string, unknown> }
  }
  const data = candidate.response?.data
  if (
    data &&
    typeof data.detail === 'string' &&
    typeof data.message !== 'string'
  ) {
    data.message = data.detail
  }
  return error
}

export function getApiBaseUrl(explicitBaseUrl?: string) {
  return explicitBaseUrl || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
}

export function createApiClient(explicitBaseUrl?: string) {
  const client = axios.create({
    baseURL: getApiBaseUrl(explicitBaseUrl),
    headers: {
      Accept: 'application/vnd.ouiboo.v2+json',
    },
  })
  client.interceptors.response.use(
    unwrapApiEnvelope,
    (error) => Promise.reject(normalizeApiProblem(error))
  )
  return client
}

export function attachBrowserAuth(
  client: AxiosInstance,
  explicitBaseUrl?: string,
  options: BrowserAuthOptions = {}
) {
  const {
    loginPath = DEFAULT_LOGIN_PATH,
    tokenKey = DEFAULT_TOKEN_KEY,
    refreshTokenKey = DEFAULT_REFRESH_TOKEN_KEY,
  } = options

  let refreshPromise: Promise<string | null> | null = null
  const apiBaseUrl = getApiBaseUrl(explicitBaseUrl)

  const refreshAccessToken = async () => {
    if (typeof window === 'undefined') return null

    const refreshToken = window.localStorage.getItem(refreshTokenKey)
    if (!refreshToken) return null

    const response = await axios.post(`${apiBaseUrl}/auth/refresh`, {
      refresh_token: refreshToken,
    })
    const { accessToken, refreshToken: rotatedRefreshToken } =
      response.data || {}

    if (accessToken) window.localStorage.setItem(tokenKey, accessToken)
    if (rotatedRefreshToken) {
      window.localStorage.setItem(refreshTokenKey, rotatedRefreshToken)
    }

    return accessToken || null
  }

  const getRefreshedToken = async () => {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }

  client.interceptors.request.use((config) => {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(tokenKey)
        : null
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      if (error.response?.status === 401 && !originalRequest?._retry) {
        originalRequest._retry = true

        try {
          const newToken = await getRefreshedToken()
          if (newToken) {
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${newToken}`,
            }
            return client(originalRequest)
          }
        } catch {
          // Continue to the logout path when refresh fails.
        }

        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(tokenKey)
          window.localStorage.removeItem(refreshTokenKey)
          window.location.href = loginPath
        }
      }

      return Promise.reject(error)
    }
  )

  return client
}

export function createBrowserApiClient(
  explicitBaseUrl?: string,
  options: BrowserAuthOptions = {}
) {
  return attachBrowserAuth(
    createApiClient(explicitBaseUrl),
    explicitBaseUrl,
    options
  )
}
