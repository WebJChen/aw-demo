/**
 * 状态演示缩略图：使用 `assets/img/item` 下塔斯马尼亚两个酒款目录的资源（与网格 item 同源）。
 */

export const DEMO_ITEM_IMAGE_PRIMARY = '@/assets/img/item/Tasmania/TolpuddleVineyard/pinotNoir.png'
export const DEMO_ITEM_IMAGE_SECONDARY = '@/assets/img/item/Tasmania/DevilsCorner/pinotNoir.webp'

/** 轮换使用（订单多行 / 购物车多行） */
export const DEMO_IMAGE_PAIR = [DEMO_ITEM_IMAGE_PRIMARY, DEMO_ITEM_IMAGE_SECONDARY]

/**
 * @param {number} idx 行序号（同订单明细 lineIndex）
 */
export function demoThumbnailByLineIndex(idx) {
  const n = Math.max(0, Math.floor(Number(idx)) || 0)
  return DEMO_IMAGE_PAIR[n % DEMO_IMAGE_PAIR.length]
}
