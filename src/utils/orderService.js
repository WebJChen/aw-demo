import { isApiEnabled } from '@/utils/auswineApi'
import {
  loadRemoteOrderDetail,
  loadRemoteOrders,
  submitRemoteOrder,
} from '@/utils/cartService'

export { submitRemoteOrder, loadRemoteOrders, loadRemoteOrderDetail }

export function isRemoteOrderEnabled() {
  return isApiEnabled()
}

export async function listOrders({ pageNum = 1, pageSize = 50 } = {}) {
  if (!isRemoteOrderEnabled()) return null
  const page = await loadRemoteOrders({ pageNum, pageSize })
  if (!page || !Array.isArray(page.items)) return []
  return page.items.map(normalizeOrderRow)
}

export async function getOrderDetail(orderNo) {
  if (!isRemoteOrderEnabled()) return null
  const row = await loadRemoteOrderDetail(orderNo)
  return row ? normalizeOrderRow(row) : null
}

function normalizeOrderRow(row) {
  if (!row || typeof row !== 'object') return null
  const contact = row.contact && typeof row.contact === 'object' ? row.contact : {}
  const items = Array.isArray(row.items)
    ? row.items.map((line, lineIndex) => ({
      cartId: line.cartId || line.cartKey || '',
      title: line.title || '',
      enTitle: line.enTitle || '',
      img: line.img || line.coverUrl || '',
      price: Number(line.price) || 0,
      quantity: Math.max(1, Number(line.quantity) || 1),
      wineOrigin: line.wineOrigin || '',
      wineVintage: line.wineVintage || '',
      regionName: line.regionName || '',
      subNavName: line.subNavName || '',
      regionPath: line.regionPath || '',
      lineIndex: line.lineIndex ?? lineIndex,
    }))
    : []

  return {
    orderNo: row.orderNo || '',
    paidAt: Number(row.paidAt) || Date.now(),
    savedAt: Number(row.paidAt) || Date.now(),
    status: row.status || 'paid',
    paidAmount: String(row.paidAmount ?? '0.00'),
    paidQuantity: Number(row.paidQuantity) || items.reduce((sum, item) => sum + item.quantity, 0),
    contact: {
      contactName: contact.contactName || row.contactName || '',
      phone: contact.phone || row.phone || '',
      email: contact.email || row.email || '',
      address: contact.address || row.address || '',
    },
    payMethod: row.payMethod || '',
    payMethodLabel: row.payMethodLabel || '',
    remark: row.remark || '',
    items,
  }
}
