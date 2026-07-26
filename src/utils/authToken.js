const AUTH_TOKEN_STORAGE_KEY = 'aw_auth_token'

let authToken = loadStoredToken()

function loadStoredToken() {
  if (typeof localStorage === 'undefined') return ''
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function getAuthToken() {
  return authToken || ''
}

export function persistAuthToken(token) {
  authToken = token ? String(token).trim() : ''
  if (typeof localStorage === 'undefined') return
  try {
    if (authToken) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken)
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

export function clearAuthToken() {
  persistAuthToken('')
}
