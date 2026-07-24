import {
  createOrder,
  fetchCart,
  fetchOrderDetail,
  fetchOrders,
  isApiEnabled,
  saveCart,
} from '@/utils/auswineApi'

export function isRemoteCartEnabled() {
  return isApiEnabled()
}

export async function loadRemoteCart() {
  if (!isRemoteCartEnabled()) return null
  const rows = await fetchCart()
  return Array.isArray(rows) ? rows : []
}

export async function syncRemoteCart(items) {
  if (!isRemoteCartEnabled()) return null
  const payload = Array.isArray(items) ? items : []
  const rows = await saveCart(payload)
  return Array.isArray(rows) ? rows : []
}

export async function submitRemoteOrder(payload) {
  if (!isApiEnabled()) return null
  return createOrder(payload)
}

export async function loadRemoteOrders({ pageNum = 1, pageSize = 20 } = {}) {
  if (!isApiEnabled()) return null
  return fetchOrders({ pageNum, pageSize })
}

export async function loadRemoteOrderDetail(orderNo) {
  if (!isApiEnabled() || !orderNo) return null
  return fetchOrderDetail(orderNo)
}
