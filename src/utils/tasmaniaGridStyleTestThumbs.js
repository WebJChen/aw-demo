/**
 * 【样式测试·可删】塔斯马尼亚酒款相关 UI 共用：DevilsCorner / TolpuddleVineyard 两张图按索引轮换。
 * 用于 ItemGrid、购物车、结算摘要等；正式发布前删除本文件，并移除各处的 import 与分支逻辑。
 */
import tasGridTestImgDevilsCorner from '@/assets/img/item/Tasmania/DevilsCorner/pinotNoir.webp'
import tasGridTestImgTolpuddle from '@/assets/img/item/Tasmania/TolpuddleVineyard/pinotNoir.png'

export const TAS_GRID_STYLE_TEST_IMAGES = Object.freeze([tasGridTestImgDevilsCorner, tasGridTestImgTolpuddle])

/** @param {number} index 非负整数；与网格 row.idx 或购物车内顺序一致时轮换结果与列表对齐 */
export function tasGridStyleTestThumbByIndex(index) {
  const n = Number(index)
  const i = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  return TAS_GRID_STYLE_TEST_IMAGES[i % TAS_GRID_STYLE_TEST_IMAGES.length]
}
