/**
 * 固定演示订单：不参与 sessionStorage，仅用于「我的订单」与各阶段 UI。
 * 订单号以 DEMO- 前缀避免与真实快照冲突。
 */

import { demoThumbnailByLineIndex } from '@/utils/demoStaticMedia'

const DEMO_TS = 1739097600000 // 2025-02-09 固定展示用时间戳

/**
 * @param extras 可含 __thumbIdx 指定演示图序号（与同单内行序号一致即可）
 */
const wineLine = (suffix, extras = {}) => {
  const thumbIdx = Number.isFinite(Number(extras.__thumbIdx))
    ? Math.max(0, Math.floor(Number(extras.__thumbIdx)))
    : 0
  const { __thumbIdx, ...rest } = extras
  return {
    cartId: `demo-line-${suffix}`,
    title: `演示酒款 · ${suffix}`,
    enTitle: '',
    img: demoThumbnailByLineIndex(thumbIdx),
    price: 268,
    quantity: 1,
    wineOrigin: '塔斯马尼亚州',
    wineVintage: '',
    regionName: '塔斯马尼亚州',
    subNavName: '红酒',
    regionPath: 'tasmania',
    subNavPath: 'red-wine',
    lineIndex: thumbIdx,
    ...rest
  }
}

/** 固定演示快照；列表与详情只读展示 */
export const STATIC_DEMO_ORDERS = [
  {
    orderNo: 'DEMO-STATUS-AWAIT-SHIP',
    demoFulfillmentKey: 'await_ship',
    demoPinned: true,
    paidAt: DEMO_TS,
    savedAt: DEMO_TS,
    status: 'paid',
    paidAmount: '268.00',
    paidQuantity: 1,
    contact: {
      contactName: '演示 · 待发货',
      phone: '13800138000',
      email: '',
      address: '演示地址（不参与发货）'
    },
    payMethod: 'card',
    payMethodLabel: '银行卡',
    remark: '界面演示：待发货阶段',
    items: [wineLine('待发货', { __thumbIdx: 0 })]
  },
  {
    orderNo: 'DEMO-STATUS-SHIPPING',
    demoFulfillmentKey: 'shipping',
    demoPinned: true,
    paidAt: DEMO_TS - 3600000,
    savedAt: DEMO_TS - 3600000,
    status: 'paid',
    paidAmount: '536.00',
    paidQuantity: 2,
    contact: {
      contactName: '演示 · 已发货',
      phone: '13800138001',
      email: '',
      address: '演示地址（不参与发货）'
    },
    payMethod: 'wechat',
    payMethodLabel: '微信支付',
    remark: '界面演示：已发货，可点「查看物流」',
    items: [
      wineLine('已发货-A', { __thumbIdx: 0 }),
      wineLine('已发货-B', { __thumbIdx: 1, quantity: 1, price: 268 })
    ]
  },
  {
    orderNo: 'DEMO-STATUS-AWAIT-RECV',
    demoFulfillmentKey: 'await_receive',
    demoPinned: true,
    paidAt: DEMO_TS - 7200000,
    savedAt: DEMO_TS - 7200000,
    status: 'paid',
    paidAmount: '268.00',
    paidQuantity: 1,
    contact: {
      contactName: '演示 · 待收货',
      phone: '13800138002',
      email: '',
      address: '演示地址（不参与发货）'
    },
    payMethod: 'alipay',
    payMethodLabel: '支付宝',
    remark: '界面演示：待收货',
    items: [wineLine('待收货', { __thumbIdx: 0 })]
  },
  {
    orderNo: 'DEMO-STATUS-PENDING-REVIEW',
    demoFulfillmentKey: 'pending_review',
    demoPinned: true,
    paidAt: DEMO_TS - 10800000,
    savedAt: DEMO_TS - 10800000,
    status: 'paid',
    paidAmount: '804.00',
    paidQuantity: 3,
    contact: {
      contactName: '演示 · 待评价',
      phone: '13800138003',
      email: '',
      address: '演示地址（不参与发货）'
    },
    payMethod: 'card',
    payMethodLabel: '银行卡',
    remark: '界面演示：收货后 · 待评价',
    items: [
      wineLine('待评价-1', { __thumbIdx: 0 }),
      wineLine('待评价-2', { __thumbIdx: 1 }),
      wineLine('待评价-3', { __thumbIdx: 2 })
    ]
  },
  {
    orderNo: 'DEMO-STATUS-COMPLETED',
    demoFulfillmentKey: 'completed',
    demoPinned: true,
    paidAt: DEMO_TS - 14400000,
    savedAt: DEMO_TS - 14400000,
    status: 'paid',
    paidAmount: '268.00',
    paidQuantity: 1,
    contact: {
      contactName: '演示 · 交易成功',
      phone: '13800138004',
      email: '',
      address: '演示地址（不参与发货）'
    },
    payMethod: 'card',
    payMethodLabel: '银行卡',
    remark: '界面演示：交易成功',
    items: [wineLine('交易成功', { __thumbIdx: 0 })]
  },
  {
    orderNo: 'DEMO-STATUS-REFUNDING',
    demoFulfillmentKey: 'refunding',
    demoPinned: true,
    paidAt: DEMO_TS - 18000000,
    savedAt: DEMO_TS - 18000000,
    status: 'paid',
    paidAmount: '199.00',
    paidQuantity: 1,
    contact: {
      contactName: '演示 · 退款处理',
      phone: '13800138005',
      email: '',
      address: '演示地址（不参与发货）'
    },
    payMethod: 'wechat',
    payMethodLabel: '微信支付',
    remark: '界面演示：退款处理中',
    items: [wineLine('退款中', { __thumbIdx: 0, price: 199 })]
  },
  {
    orderNo: 'DEMO-STATUS-AFTER-SALE',
    demoFulfillmentKey: 'after_sale',
    demoPinned: true,
    paidAt: DEMO_TS - 21600000,
    savedAt: DEMO_TS - 21600000,
    status: 'paid',
    paidAmount: '328.00',
    paidQuantity: 1,
    contact: {
      contactName: '演示 · 售后处理',
      phone: '13800138006',
      email: '',
      address: '演示地址（不参与发货）'
    },
    payMethod: 'alipay',
    payMethodLabel: '支付宝',
    remark: '界面演示：售后处理中',
    items: [wineLine('售后', { __thumbIdx: 0, price: 328 })]
  }
]

const demoOrderNoSet = new Set(STATIC_DEMO_ORDERS.map((o) => o.orderNo))

export function isStaticDemoOrderNo(orderNo) {
  return demoOrderNoSet.has(String(orderNo || '').trim())
}

export function getStaticDemoOrderByNo(orderNo) {
  const no = String(orderNo || '').trim()
  return STATIC_DEMO_ORDERS.find((o) => o.orderNo === no) ?? null
}
