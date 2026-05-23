/**
 * 酒款网格 / 详情弹窗共用的占位与可选 JSON 字段解析。
 * wineData（或条目根级）可读字段示例：
 * originRegion, wineryName, vintage/year, abv/alcoholPct, tasteProfile,
 * listPrice/originalPrice/markedPrice, rating,
 * gridBadges: [{ text, kind? }] 或字符串数组，
 * monthlySalesDisplay / transactionDisplay：成交文案（1688式，价格右侧灰色）。默认「成交128+件」，写空字符串可关。
 * ratingReviewCount / reviewCount：星级行蓝色括号数量；不写时占位 128；suppressRatingReviewCount 可关闭占位。
 */

const DEFAULT_SALE_PRICE = 188
const DEFAULT_TRANSACTION_LINE = '成交128+件'

/** 去掉「月销」等前缀；拼成类似 1688 的「成交…」文案 */
const normalizeMarketingToTxnLine = (raw) => {
  let s = String(raw ?? '').trim()
  if (!s) return ''
  if (/^成交/i.test(s)) {
    const t = s.replace(/\s+/g, '')
    if (!/[件笔万+]/u.test(t)) return `${t}件`
    return t
  }
  s = s.replace(/^\s*月销\s*[·•+]?\s*/i, '').replace(/\s*[·•]\s*/g, '').trim()
  let t = s.replace(/\s+/g, '')
  if (!/[件笔万+]/u.test(t)) t += '件'
  return /^成交/i.test(t) ? t : `成交${t}`
}
const parseOptionalPriceNum = (raw) => {
  if (raw === undefined || raw === null || raw === '') return null
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.-]/g, ''))
  return Number.isFinite(num) && num >= 0 ? num : null
}

const coerceBadgesFromWineData = (wd) => {
  const gb = wd?.gridBadges
  if (!Array.isArray(gb)) return null
  return gb.map((b) =>
    typeof b === 'string' ? { text: b, kind: 'muted' } : { kind: String(b.kind || 'muted'), text: String(b.text || '') }
  ).filter((b) => b.text)
}

/** 左上角促销条不展示月销量/成交徽章；该类文案写在 transactionLine（价格一行旁灰色字） */
const isMonthlySalesBadge = (b) => {
  const k = String(b?.kind || '').toLowerCase().trim()
  return k === 'sales' || k === 'sale'
}

/**
 * @param {*} item grid 单行 itemData
 * @param {{ regionNavName?: string }} ctx
 */
export function buildWineDisplay(item, ctx = {}) {
  const wd = item?.wineData && typeof item.wineData === 'object' ? item.wineData : {}

  const regionNav = typeof ctx.regionNavName === 'string' ? ctx.regionNavName.trim() : ''

  const saleNum =
    parseOptionalPriceNum(
      item?.price ?? item?.salePrice ?? item?.testPrice ?? item?.displayPrice ?? wd?.salePrice ?? wd?.price
    ) ?? DEFAULT_SALE_PRICE

  const explicitListRaw = parseOptionalPriceNum(
    item?.listPrice ??
      item?.originalPrice ??
      item?.markedPrice ??
      wd?.listPrice ??
      wd?.originalPrice ??
      wd?.markedPrice ??
      wd?.crossedPrice
  )

  /** 仅当数据中明确给出划线价/原价时才展示「现价 + 划线价」；不写数据则整卡只显示一行原价（现价）。 */
  const listNum =
    explicitListRaw !== null && explicitListRaw > saleNum + 1e-6 ? explicitListRaw : saleNum

  const hasDiscount = explicitListRaw !== null && explicitListRaw > saleNum + 1e-6
  const saveAmount = hasDiscount ? Math.max(0, Math.round((listNum - saleNum) * 100) / 100) : 0

  let ratingRaw = wd?.rating ?? wd?.ratingScore ?? item?.rating ?? item?.ratingScore ?? 4.7
  if (typeof ratingRaw === 'string') {
    const n = Number(ratingRaw.replace(',', '.'))
    ratingRaw = Number.isFinite(n) ? n : 4.7
  }
  if (!Number.isFinite(ratingRaw)) ratingRaw = 4.7
  const ratingStars = Math.min(5, Math.max(0, Number(ratingRaw)))

  let promoBadges = coerceBadgesFromWineData(wd)
  const explicitMonthlySales =
    typeof wd.monthlySalesDisplay === 'string' ? wd.monthlySalesDisplay.trim() : ''
  const explicitTransactionDisplay =
    typeof wd.transactionDisplay === 'string'
      ? wd.transactionDisplay.trim()
      : typeof item?.transactionDisplay === 'string'
        ? item.transactionDisplay.trim()
        : ''
  const hotFlag = wd?.hotSelling === false ? false : true

  let txnLineDraft = ''
  if (promoBadges?.length) {
    const fromSalesBadges = promoBadges.filter(isMonthlySalesBadge).map((b) => b.text).filter(Boolean)
    promoBadges = promoBadges.filter((b) => !isMonthlySalesBadge(b))
    if (fromSalesBadges.length) txnLineDraft = fromSalesBadges.join(' ')
  }
  if (explicitMonthlySales) txnLineDraft = explicitMonthlySales
  if (explicitTransactionDisplay) txnLineDraft = explicitTransactionDisplay

  const hideTransactionLine =
    wd?.suppressMonthlySalesChip === true ||
    item?.suppressMonthlySalesChip === true ||
    wd?.suppressTransactionLine === true ||
    item?.suppressTransactionLine === true ||
    wd?.monthlySalesDisplay === '' ||
    item?.monthlySalesDisplay === '' ||
    wd?.transactionDisplay === ''

  let transactionLine = ''
  if (!hideTransactionLine) {
    transactionLine = txnLineDraft ? normalizeMarketingToTxnLine(txnLineDraft) : DEFAULT_TRANSACTION_LINE
  }

  /** 星级旁括号数量，如亚马逊 (39) — ratingReviewCount / reviewCount */
  let ratingReviewRaw = wd?.ratingReviewCount ?? wd?.reviewCount ?? item?.ratingReviewCount ?? item?.reviewCount
  if (typeof ratingReviewRaw === 'string') {
    ratingReviewRaw = parseInt(String(ratingReviewRaw).replace(/\D/g, ''), 10)
    if (!Number.isFinite(ratingReviewRaw)) ratingReviewRaw = null
  }
  let ratingReviewCount = null
  if (ratingReviewRaw !== undefined && ratingReviewRaw !== null && ratingReviewRaw !== '') {
    const n = typeof ratingReviewRaw === 'number' ? ratingReviewRaw : Number(ratingReviewRaw)
    ratingReviewCount = Number.isFinite(n) && n >= 0 ? Math.round(n) : null
  }
  const suppressRatingParen =
    wd?.suppressRatingReviewCount === true || item?.suppressRatingReviewCount === true
  if (!suppressRatingParen && ratingReviewCount === null) {
    ratingReviewCount = 128
  }

  if (!promoBadges?.length) {
    promoBadges = []
    if (hotFlag !== false) promoBadges.push({ kind: 'hot', text: '热销' })
    promoBadges.push({ kind: 'week', text: '本周热品' })
  }

  let origin = wd?.originRegion ?? wd?.regionLabel ?? wd?.producingRegion
  if (!String(origin ?? '').trim()) {
    origin = regionNav ? String(regionNav).replace(/州|省$/u, '').trim() || regionNav : ''
  }
  if (!String(origin ?? '').trim()) origin = '澳大利亚'

  const wineryName =
    wd?.wineryName ??
    wd?.wineryLabel ??
    wd?.relatedWineryTitle ??
    (regionNav ? `${regionNav} · 甄选酒庄联名款（示意）` : '塔斯马尼亚 · 甄选酒庄（示意）')

  const vintage = String(wd?.vintage ?? wd?.year ?? wd?.harvestYear ?? item?.vintage ?? '2022')

  const abvRaw = wd?.abv ?? wd?.alcoholStrength ?? wd?.alcoholPct ?? item?.abv ?? '13.8%vol'
  const abvDisplay = /\d/.test(String(abvRaw)) ? String(abvRaw) : `${abvRaw}`

  const taste =
    wd?.tasteProfile ??
    wd?.tastingNotes ??
    wd?.flavorNotes ??
    item?.tasteProfile ??
    '黑莓・石墨・柔和单宁收口（占位口味描述，可写入 wineData.tasteProfile）'

  return {
    origin,
    wineryName,
    vintage,
    abv: abvDisplay,
    taste,
    ratingStars,
    promoBadges,
    /** 1688式：紧跟价格旁的灰色成交文案（非胶囊） */
    transactionLine: transactionLine.trim() ? transactionLine : null,
    /** 星级行右侧括号：(评价/成交笔数) */
    ratingReviewCount,
    listNum,
    saleNum,
    hasDiscount,
    saveAmount,
    currencySymbol: (() => {
      const sym = typeof item?.currencySymbol === 'string' ? item.currencySymbol : typeof wd.currencySymbol === 'string' ? wd.currencySymbol : ''
      const t = sym.trim()
      return t || '¥'
    })()
  }
}

/**
 * 购物车单价：与网格 `buildWineDisplay` 现价一致（含占位价），避免购物车与网格标价脱节。
 */
export function resolveWineCartUnitPrice(item, ctx = {}) {
  const sale = buildWineDisplay(item, ctx)?.saleNum
  const n = Number(sale)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SALE_PRICE
}

export function wineSpecRows(display, fallbackIntroLines = []) {
  const rows = [
    { label: '产地：', value: display.origin },
    { label: '酒庄：', value: display.wineryName },
    { label: '年份：', value: display.vintage },
    { label: '酒精度：', value: display.abv },
    { label: '口味：', value: display.taste }
  ]
  if (Array.isArray(fallbackIntroLines)) {
    for (const line of fallbackIntroLines) {
      if (line?.label && line?.value) rows.push({ label: line.label, value: line.value })
    }
  }
  return rows
}
