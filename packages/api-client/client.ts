import axios, {
  type AxiosInstance,
  type AxiosResponse,
} from 'axios'

const DEFAULT_API_URL = 'http://localhost:3000/api/v1'
const DEFAULT_LOGIN_PATH = '/login'

let browserAccessToken: string | null = null

export interface BrowserAuthOptions {
  loginPath?: string
}

export async function setBrowserAccessToken(token: string | null): Promise<void> {
  browserAccessToken = token
  // Establish the BFF app session (#208) so the Next.js proxy can validate
  // authenticated requests. MUST be awaited before redirecting to protected
  // routes, otherwise the proxy will not see the session cookie yet.
  if (token && typeof window !== 'undefined') {
    await establishAppSession(token).catch(() => {
      // Session establishment is best-effort; API auth is authoritative.
    })
  }
}

export function clearBrowserAccessToken() {
  browserAccessToken = null
  // Clear the BFF app session (#208). Fire-and-forget.
  if (typeof window !== 'undefined') {
    clearAppSession().catch(() => {
      // Best-effort; the proxy will fail closed on the next request.
    })
  }
}

/**
 * Establishes the app-domain session cookie via the Next.js BFF route.
 * The BFF validates the access token with the API and sets a signed,
 * HttpOnly session cookie that the proxy can verify.
 */
export async function establishAppSession(accessToken: string): Promise<void> {
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken }),
  })
}

/**
 * Clears the app-domain session cookie via the Next.js BFF route.
 */
export async function clearAppSession(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE' })
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
  } = options

  let refreshPromise: Promise<string | null> | null = null
  const apiBaseUrl = getApiBaseUrl(explicitBaseUrl)

  const refreshAccessToken = async () => {
    if (typeof window === 'undefined') return null

    const response = await axios.post(
      `${apiBaseUrl}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    const payload = isApiEnvelope(response.data)
      ? response.data.data as { accessToken?: string }
      : response.data as { accessToken?: string }
    const { accessToken } = payload || {}

    setBrowserAccessToken(accessToken || null)

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
    if (browserAccessToken) {
      config.headers.Authorization = `Bearer ${browserAccessToken}`
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      if (
        error.response?.status === 401 &&
        !originalRequest?._retry &&
        !String(originalRequest?.url || '').includes('/auth/refresh')
      ) {
        const hadAccessToken = Boolean(browserAccessToken)
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
          clearBrowserAccessToken()
          const requestUrl = String(originalRequest?.url || '')
          const isAnonymousProfileProbe =
            !hadAccessToken &&
            requestUrl.includes('/users/me')
          // Don't redirect when the 401 came from the login endpoint itself —
          // the login form needs to receive the error to display it (#54, #55, #56)
          const isLoginAttempt = requestUrl.includes('/auth/login')
          if (!isAnonymousProfileProbe && !isLoginAttempt) {
            window.location.href = loginPath
          }
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
  const client = createApiClient(explicitBaseUrl)
  client.defaults.withCredentials = true
  return attachBrowserAuth(
    client,
    explicitBaseUrl,
    options
  )
}
