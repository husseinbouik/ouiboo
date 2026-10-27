import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

const DEFAULT_API_URL = 'http://localhost:3000/api/v1'
const DEFAULT_LOGIN_PATH = '/login'

// Cold-start resilience (#318): after the stack has been idle, the first
// requests can hang while cold serverless functions and a suspended database
// wake up. Bound every call with a timeout and retry a request that never
// received a response exactly once (see createApiClient / establishAppSession).
const API_REQUEST_TIMEOUT_MS = 20000
const NETWORK_RETRY_DELAY_MS = 1500
const SESSION_REQUEST_TIMEOUT_MS = 15000
const SESSION_RETRY_DELAY_MS = 1000

let browserAccessToken: string | null = null

// Session hint (#245). The access token lives only in memory, so after a
// reload nothing client-side can tell "returning user whose token must be
// restored via the refresh cookie" apart from "anonymous visitor" — and
// the auth layer probed GET /users/me for everyone, producing a 401 (plus
// a second 401 from the refresh attempt) in the console of every
// anonymous page view. This hint is the discriminator: it is written to
// localStorage exactly when a token is stored (every login/verify flow
// and every successful refresh goes through setBrowserAccessToken) and
// removed whenever the token is cleared. It carries no credential value —
// only the fact that a session may exist.
export const BROWSER_SESSION_HINT_KEY = 'ouiboo.session.hint'

function writeBrowserSessionHint(): void {
  try {
    window.localStorage.setItem(BROWSER_SESSION_HINT_KEY, '1')
  } catch {
    // Storage unavailable (privacy mode, disabled cookies): the hint is
    // an optimisation, never a requirement — probing stays as before.
  }
}

function removeBrowserSessionHint(): void {
  try {
    window.localStorage.removeItem(BROWSER_SESSION_HINT_KEY)
  } catch {
    // See writeBrowserSessionHint.
  }
}

export function hasBrowserSessionHint(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(BROWSER_SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * True when a session may exist: an in-memory access token, or the
 * persisted hint that one was stored before a reload.
 */
export function hasPossibleBrowserSession(): boolean {
  return Boolean(browserAccessToken) || hasBrowserSessionHint()
}

export interface BrowserAuthOptions {
  loginPath?: string
}

export async function setBrowserAccessToken(token: string | null): Promise<void> {
  browserAccessToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      writeBrowserSessionHint()
    } else {
      removeBrowserSessionHint()
    }
  }
  // Establish the BFF app session (#208) so the Next.js proxy can validate
  // authenticated requests. MUST be awaited before redirecting to protected
  // routes, otherwise the proxy will not see the session cookie yet.
  // Errors are intentionally propagated: a login that succeeds at the API
  // but fails to establish the app session must surface visibly (#234)
  // instead of silently bouncing the user back to the login page.
  if (token && typeof window !== 'undefined') {
    await establishAppSession(token)
  }
}

export function clearBrowserAccessToken() {
  browserAccessToken = null
  if (typeof window !== 'undefined') {
    removeBrowserSessionHint()
  }
  // Clear the BFF app session (#208). Fire-and-forget.
  if (typeof window !== 'undefined') {
    clearAppSession().catch(() => {
      // Best-effort; the proxy will fail closed on the next request.
    })
  }
}

async function postAppSession(accessToken: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    SESSION_REQUEST_TIMEOUT_MS
  )
  try {
    return await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Establishes the app-domain session cookie via the Next.js BFF route.
 * The BFF validates the access token with the API and sets a signed,
 * HttpOnly session cookie that the proxy can verify.
 *
 * The whole call is retried exactly once when an attempt fails without an
 * authoritative answer: a network/timeout failure, or a 502 from the BFF
 * route (its "upstream API unreachable" code, #318). Every other non-2xx
 * response is authoritative and is not retried.
 */
export async function establishAppSession(accessToken: string): Promise<void> {
  let lastNetworkError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, SESSION_RETRY_DELAY_MS)
      )
    }
    let res: Response
    try {
      res = await postAppSession(accessToken)
    } catch (error) {
      lastNetworkError = error
      continue
    }
    if (res.ok) return
    if (res.status === 502 && attempt === 0) continue
    // Fail loudly (#234): a non-2xx response means the session cookie was not
    // set, so callers (e.g. login onSuccess) must not proceed to protected
    // routes as if the user were authenticated.
    throw new Error(`Session establishment failed: ${res.status}`)
  }
  throw lastNetworkError instanceof Error
    ? lastNetworkError
    : new Error('Session establishment failed: network error')
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
    timeout: API_REQUEST_TIMEOUT_MS,
    headers: {
      Accept: 'application/vnd.ouiboo.v2+json',
    },
  })
  client.interceptors.response.use(
    unwrapApiEnvelope,
    (error) => Promise.reject(normalizeApiProblem(error))
  )
  // Cold-start resilience (#318): a request that fails WITHOUT a response
  // (network error or client timeout — e.g. the first hit waking a suspended
  // database or a cold function) is retried exactly once after a short
  // backoff. Errors with a response are never retried: the server answered,
  // so replaying could duplicate side effects or mask real failures. The
  // `_networkRetry` flag on the config guards against retry loops.
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error?.config as
        | (InternalAxiosRequestConfig & { _networkRetry?: boolean })
        | undefined
      if (!error?.response && config && !config._networkRetry) {
        config._networkRetry = true
        await new Promise((resolve) =>
          setTimeout(resolve, NETWORK_RETRY_DELAY_MS)
        )
        return client(config)
      }
      return Promise.reject(error)
    }
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

        // #245: attempt the refresh only when a session can exist. With
        // no in-memory token and no session hint, the refresh cookie
        // cannot be there either (the hint is written whenever a token
        // is stored), so the refresh would only add a second 401 to the
        // console of an anonymous visit.
        if (hadAccessToken || hasBrowserSessionHint()) {
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
