/**
 * 购物车内置「演示备货」：字段对齐 `cartStore.addCartItem` 写入结构，便于结算与跳转网格定位；
 * 不写 localStorage；支付卸货后仍保留；缩略图使用 item/Tasmania 下 TolpuddleVineyard、DevilsCorner 资源。
 */

import { demoThumbnailByLineIndex } from '@/utils/demoStaticMedia'

/** 与 ItemGrid `buildHitKey` 规则一致（标题 slug） */
export const DEMO_HIT_TOLPUDDLE = 'wine__tasmania__red-wine__tolpuddle-vineyard-pinot-noir'
export const DEMO_HIT_DEVILS_CORNER = 'wine__tasmania__red-wine__devils-corner-pinot-noir'
export const DEMO_HIT_TAMAR_RIDGE = 'wine__tasmania__red-wine__tamar-ridge-pinot-noir'

const DEMO_ROW_BLUEPRINT = [
  {
    cartId: '__demo_pin_tolpuddle__',
    stateLabel: '演示备货 · 支付后仍保留',
    title: 'Tolpuddle Vineyard Pinot Noir',
    enTitle: 'Tolpuddle Vineyard Pinot Noir',
    desc: 'From Tolpuddle Vineyard',
    price: 268,
    quantity: 2,
    selected: true,
    wineOrigin: '塔斯马尼亚州',
    wineVintage: '',
    regionName: '塔斯马尼亚州',
    subNavName: '红酒',
    regionPath: 'tasmania',
    subNavPath: 'red-wine',
    sourceHitKey: DEMO_HIT_TOLPUDDLE
  },
  {
    cartId: '__demo_pin_devils_corner__',
    stateLabel: '演示备货 · 默认未勾选',
    title: 'Devil’s Corner Pinot Noir',
    enTitle: 'Devil’s Corner Pinot Noir',
    desc: 'From Devil‘s Corner',
    price: 298,
    quantity: 1,
    selected: false,
    wineOrigin: '塔斯马尼亚州',
    wineVintage: '',
    regionName: '塔斯马尼亚州',
    subNavName: '红酒',
    regionPath: 'tasmania',
    subNavPath: 'red-wine',
    sourceHitKey: DEMO_HIT_DEVILS_CORNER
  },
  {
    cartId: '__demo_pin_tamar_ridge__',
    stateLabel: '演示备货 · 多件',
    title: 'Tamar Ridge Pinot Noir',
    enTitle: 'Tamar Ridge Pinot Noir',
    desc: 'From Tamar Ridge',
    price: 188,
    quantity: 6,
    selected: true,
    wineOrigin: '塔斯马尼亚州',
    wineVintage: '',
    regionName: '塔斯马尼亚州',
    subNavName: '红酒',
    regionPath: 'tasmania',
    subNavPath: 'red-wine',
    sourceHitKey: DEMO_HIT_TAMAR_RIDGE
  }
]

export function isDemoPinnedCartId(id) {
  const key = String(id || '').trim()
  return DEMO_ROW_BLUEPRINT.some((r) => r.cartId === key)
}

/** 每次重置「清空购物车」时用 fresh 副本 */
export function createDemoPinnedCartRows() {
  const ts = Date.now()
  return DEMO_ROW_BLUEPRINT.map((row, i) => ({
    cartId: row.cartId,
    title: row.title,
    enTitle: row.enTitle,
    desc: row.desc,
    img: demoThumbnailByLineIndex(i),
    wineOrigin: row.wineOrigin,
    wineVintage: row.wineVintage,
    price: row.price,
    quantity: Math.max(1, Number(row.quantity) || 1),
    regionPath: row.regionPath,
    regionName: row.regionName,
    subNavPath: row.subNavPath,
    subNavName: row.subNavName,
    addedAt: ts + i,
    selected: !!row.selected,
    sourceHitKey: row.sourceHitKey,
    demoPersistent: true,
    stateLabel: row.stateLabel
  }))
}
