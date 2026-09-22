import { ElMessage } from 'element-plus'
import 'element-plus/theme-chalk/el-message.css'

let lastNotifyKey = ''
let lastNotifyAt = 0

const DEDUPE_MS = 3000

const USER_MESSAGES = {
  network: '网络异常，请检查网络后重试',
  timeout: '请求超时，请稍后重试',
  service: '服务繁忙，请稍后再试',
  auth: '未登录或登录已过期，请重新登录',
  generic: '加载失败，请稍后再试',
}

const BACKEND_GENERIC_FAIL = '操作失败，请稍后重试'

const KNOWN_USER_MESSAGES = new Set([
  ...Object.values(USER_MESSAGES),
  '加载失败，请稍后再试',
])

function shouldNotify(dedupeKey) {
  const now = Date.now()
  if (dedupeKey === lastNotifyKey && now - lastNotifyAt < DEDUPE_MS) {
    return false
  }
  lastNotifyKey = dedupeKey
  lastNotifyAt = now
  return true
}

function classifyApiError(error) {
  const raw = String(error?.message || '').trim()
  const status = Number(error?.status || (raw.match(/^HTTP (\d+)/i)?.[1]))

  if (status === 401 || error?.code === 401) return 'auth'
  if (status >= 500) return 'service'
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError' || /timeout|aborted|请求超时/i.test(raw)) {
    return 'timeout'
  }
  if (error?.name === 'TypeError' || /failed to fetch|network|load failed/i.test(raw)) {
    return 'network'
  }
  if (/网络异常/.test(raw)) return 'network'
  if (/服务繁忙/.test(raw)) return 'service'
  if (/未登录|登录已过期/.test(raw)) return 'auth'
  return 'generic'
}

function isBusinessMessage(raw) {
  if (!raw || /^HTTP \d+$/i.test(raw)) return false
  if (/validation failed|argument \[|Field error/i.test(raw)) return false
  return raw.length <= 120 && /[\u4e00-\u9fff]/.test(raw)
}

export function getApiErrorMessage(error) {
  if (!error) {
    return USER_MESSAGES.generic
  }

  const raw = String(error.message || '').trim()
  if (raw === BACKEND_GENERIC_FAIL || /^操作失败/.test(raw)) {
    return USER_MESSAGES.generic
  }
  if (KNOWN_USER_MESSAGES.has(raw)) {
    return raw
  }
  if (isBusinessMessage(raw)) {
    return raw
  }

  return USER_MESSAGES[classifyApiError(error)] || USER_MESSAGES.generic
}

export function notifyApiError(error, { action = '操作', dedupeKey } = {}) {
  const message = getApiErrorMessage(error)
  const key = dedupeKey || `error:${action}:${message}`
  if (!shouldNotify(key)) return
  ElMessage.error({ message, duration: 5000, showClose: true, offset: 80 })
}
