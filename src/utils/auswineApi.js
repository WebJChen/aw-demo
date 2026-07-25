const DEFAULT_BASE = '/api'
let tokenRefreshHandler = null

function apiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
}

function buildUrl(path, params) {
  const base = apiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${normalizedPath}`
  if (!params || !Object.keys(params).length) return url
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `${url}?${query}` : url
}

function buildHeaders(token, withJsonBody = false) {
  const headers = { Accept: 'application/json' }
  if (withJsonBody) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.token = token
  }
  return headers
}

export class ApiError extends Error {
  constructor(message, { status, code, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.cause = cause
  }
}

async function parseResponse(response) {
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const status = response.status
    if (status >= 500) {
      throw new ApiError('服务繁忙，请稍后再试', { status })
    }
    if (status === 401 || payload?.code === 401) {
      throw new ApiError('未登录或登录已过期，请重新登录', { status, code: 401 })
    }
    throw new ApiError(payload?.msg || `请求失败（HTTP ${status}）`, { status })
  }

  if (!payload || payload.code !== 1) {
    if (payload?.code === 401) {
      throw new ApiError('未登录或登录已过期，请重新登录', { code: 401 })
    }
    const message = payload?.msg || '加载失败，请稍后再试'
    throw new ApiError(message, { code: payload?.code })
  }
  return payload.data
}

async function requestJson(path, { params, method = 'GET', body, token } = {}) {
  try {
    const response = await fetch(buildUrl(path, params), {
      method,
      headers: buildHeaders(token, body !== undefined),
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const refreshedToken = response.headers.get('X-Auth-Token')
    if (refreshedToken && typeof tokenRefreshHandler === 'function') {
      tokenRefreshHandler(refreshedToken)
    }
    return parseResponse(response)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    const message = String(error?.message || '')
    if (error?.name === 'TypeError' || /failed to fetch|network|load failed/i.test(message)) {
      throw new ApiError('网络异常，请检查网络后重试', { cause: error })
    }
    throw new ApiError(message || '请求失败', { cause: error })
  }
}

export function registerTokenRefreshHandler(handler) {
  tokenRefreshHandler = typeof handler === 'function' ? handler : null
}

/** gh-pages 等静态部署：使用 fallback JSON，不走 API */
export function isLocalJsonFallbackEnabled() {
  return import.meta.env.PROD
    && String(import.meta.env.VITE_USE_LOCAL_JSON_FALLBACK || '').toLowerCase() === 'true'
}

/** 是否走后端 API：本地开发无条件 true；gh-pages fallback 时为 false */
export function isApiEnabled() {
  if (isLocalJsonFallbackEnabled()) {
    return false
  }
  if (import.meta.env.DEV) {
    return true
  }
  return String(import.meta.env.VITE_USE_API || '').toLowerCase() === 'true'
}

export async function pingApi() {
  return requestJson('/common/ping')
}

export async function fetchNavTree({ catalogType } = {}) {
  return requestJson('/aw/nav', {
    params: { catalogType },
  })
}

export async function fetchWineCatalog({
  state,
  subNav,
  q,
  priceMin,
  priceMax,
  sort,
  pageNum = 1,
  pageSize = 24,
} = {}) {
  return requestJson('/aw/wines', {
    params: {
      state,
      subNav,
      q,
      priceMin,
      priceMax,
      sort,
      pageNum,
      pageSize,
    },
  })
}

export async function fetchWineDetail(wineId) {
  return requestJson(`/aw/wines/${wineId}`)
}

export async function fetchWineryCatalog({
  state,
  subNav,
  pageNum = 1,
  pageSize = 24,
} = {}) {
  return requestJson('/aw/wineries', {
    params: { state, subNav, pageNum, pageSize },
  })
}

export async function fetchWineryDetail(wineryId) {
  return requestJson(`/aw/wineries/${wineryId}`)
}

export async function fetchWineryWines(wineryId, { pageNum = 1, pageSize = 24 } = {}) {
  return requestJson(`/aw/wineries/${wineryId}/wines`, {
    params: { pageNum, pageSize },
  })
}

export async function searchCatalogRemote(keyword, {
  type = 'all',
  pageNum = 1,
  pageSize = 10,
} = {}) {
  return requestJson('/aw/search', {
    params: {
      q: keyword,
      type,
      pageNum,
      pageSize,
    },
  })
}

export async function fetchCatalogFacets({ state } = {}) {
  return requestJson('/aw/catalog/facets', {
    params: { state },
  })
}

export async function fetchAuthSession() {
  return requestJson('/auth/session')
}

export async function loginAccount(username, password) {
  return requestJson('/auth/login', {
    method: 'POST',
    body: { username, password },
  })
}

export async function registerAccount(payload) {
  return requestJson('/auth/register', {
    method: 'POST',
    body: payload,
  })
}

export async function logoutAccount() {
  return requestJson('/auth/logout', {
    method: 'POST',
  })
}

export async function fetchCart(token) {
  return requestJson('/aw/cart', { token })
}

export async function saveCart(items, token) {
  return requestJson('/aw/cart', {
    method: 'PUT',
    body: { items: Array.isArray(items) ? items : [] },
    token,
  })
}

export async function createOrder(payload, token) {
  return requestJson('/aw/orders', {
    method: 'POST',
    body: payload,
    token,
  })
}

export async function fetchOrders(token, { pageNum = 1, pageSize = 20 } = {}) {
  return requestJson('/aw/orders', {
    token,
    params: { pageNum, pageSize },
  })
}

export async function fetchOrderDetail(orderNo, token) {
  return requestJson(`/aw/orders/${orderNo}`, { token })
}
