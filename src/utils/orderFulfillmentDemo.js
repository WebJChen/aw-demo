/**
 * 订单列表 Mock：履约进度与可操作项（无后端时使用；对接真实履约后替换为接口字段）。
 */

const PHASE_SEQUENCE = ['await_ship', 'shipping', 'await_receive', 'pending_review', 'completed']

const PHASE_LABELS = {
  await_ship: '待发货',
  shipping: '已发货',
  await_receive: '待收货',
  pending_review: '待评价',
  completed: '交易成功',
  refunding: '退款处理中',
  after_sale: '售后处理中'
}

/** @param {'default'|'success'|'warning'|'danger'|'info'} variant */
export function fulfillmentVariantForPhaseKey(key) {
  switch (key) {
    case 'completed':
    case 'pending_review':
      return 'success'
    case 'shipping':
      return 'info'
    case 'await_ship':
    case 'await_receive':
      return 'warning'
    case 'refunding':
      return 'danger'
    case 'after_sale':
      return 'info'
    default:
      return 'info'
  }
}

function hashOrderId(orderNo) {
  const id = String(orderNo || '')
  let n = 0
  for (let i = 0; i < id.length; i++) {
    n = (n * 31 + id.charCodeAt(i)) >>> 0
  }
  return n
}

/**
 * @param {{ orderNo?: string } | null} order 订单快照一行
 * @param {number} [listIndex 在列表中的下标（稳定加一点变化）
 */
export function getDemoFulfillmentForOrder(order, listIndex = 0) {
  const fixed = String(order?.demoFulfillmentKey || '').trim()
  if (fixed && Object.prototype.hasOwnProperty.call(PHASE_LABELS, fixed)) {
    return { key: fixed, label: PHASE_LABELS[fixed] }
  }
  const h = hashOrderId(order?.orderNo) + (Number(listIndex) || 0)
  /** 少部分单进入退款 / 售后，便于演示按钮差异 */
  if (h % 17 === 0) {
    return { key: 'refunding', label: PHASE_LABELS.refunding }
  }
  if (h % 19 === 0) {
    return { key: 'after_sale', label: PHASE_LABELS.after_sale }
  }
  const key = PHASE_SEQUENCE[h % PHASE_SEQUENCE.length]
  return { key, label: PHASE_LABELS[key] || key }
}

/**
 * 订单列表筛选：履约进度（与 PHASE_LABELS 一致，首项为全部）
 */
export const ORDER_PROGRESS_FILTER_OPTIONS = [
  { value: 'all', label: '全部进度' },
  { value: 'await_ship', label: PHASE_LABELS.await_ship },
  { value: 'shipping', label: PHASE_LABELS.shipping },
  { value: 'await_receive', label: PHASE_LABELS.await_receive },
  { value: 'pending_review', label: PHASE_LABELS.pending_review },
  { value: 'completed', label: PHASE_LABELS.completed },
  { value: 'refunding', label: PHASE_LABELS.refunding },
  { value: 'after_sale', label: PHASE_LABELS.after_sale }
]

/**
 * 列表操作区（与进度联动；接真实接口后整函数替换即可）
 * - 已发货：查看物流（敬请期待弹窗）
 * - 任意阶段：申诉
 * - 收货完成后（待评价 / 交易成功）：售后、评价
 * - 售后处理中：保留售后入口
 */
export function buildOrderListActions(fulfillmentKey) {
  const actions = []
  if (fulfillmentKey === 'shipping') {
    actions.push({ label: '查看物流', kind: 'logistics' })
  }
  if (fulfillmentKey === 'pending_review' || fulfillmentKey === 'completed') {
    actions.push({ label: '售后', kind: 'afterSale' })
    actions.push({ label: '评价', kind: 'review' })
  }
  if (fulfillmentKey === 'after_sale') {
    actions.push({ label: '售后', kind: 'afterSale' })
  }
  actions.push({ label: '申诉', kind: 'appeal' })
  return actions
}
