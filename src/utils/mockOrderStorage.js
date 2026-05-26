/** 模拟支付成功后的订单快照（sessionStorage）；无后端时使用，键内按订单号存 Map */
const STORAGE_KEY = 'aw_mock_orders_v1'

export function saveMockOrderDetail(payload) {
  if (typeof window === 'undefined' || !payload?.orderNo) return
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const map = raw ? JSON.parse(raw) : {}
    if (typeof map !== 'object' || map === null) return
    map[payload.orderNo] = { ...payload, savedAt: Date.now() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch (_) {
    /* ignore */
  }
}

export function loadMockOrderDetail(orderNo) {
  if (typeof window === 'undefined' || !orderNo) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const map = raw ? JSON.parse(raw) : {}
    const row = map[orderNo]
    return row && typeof row === 'object' ? row : null
  } catch (_) {
    return null
  }
}

/** 我的订单列表：按保存/支付时间倒序 */
export function listMockOrders() {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const map = raw ? JSON.parse(raw) : {}
    if (!map || typeof map !== 'object') return []
    return Object.values(map)
      .filter((row) => row && typeof row === 'object' && row.orderNo)
      .sort((a, b) => {
        const tb = Number(b.savedAt ?? b.paidAt) || 0
        const ta = Number(a.savedAt ?? a.paidAt) || 0
        return tb - ta
      })
  } catch (_) {
    return []
  }
}

/**
 * 从会话快照中移除一条订单（仅本地 sessionStorage）；不存在则返回 false
 */
export function removeMockOrder(orderNo) {
  if (typeof window === 'undefined' || !orderNo) return false
  const no = String(orderNo).trim()
  if (!no) return false
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const map = raw ? JSON.parse(raw) : {}
    if (!map || typeof map !== 'object') return false
    if (!Object.prototype.hasOwnProperty.call(map, no)) return false
    delete map[no]
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    return true
  } catch (_) {
    return false
  }
}
