const WINERY_TYPE_LABELS = {
  wine: '葡萄酒酒庄',
  Spirits: '洋酒酒庄',
  spirits: '洋酒酒庄',
  spirit: '洋酒酒庄',
  'other-spirits': '其它酒类酒庄'
}

const VISIT_LABELS = ['品鉴室开放', '需预约参观', '周末开放', '全年开放']
const STYLE_TAGS = ['家族经营', '精品小批', '可持续种植', '获奖酒庄', '海景葡萄园', '百年历史']

/**
 * 酒庄网格卡片展示字段（可先写死/占位，后续接 JSON）
 */
export function buildWineryGridDisplay(item, ctx = {}) {
  const info = item?.info || item?.wineData || item?.itemData || {}
  const subNavPath = ctx?.subNavPath || 'wine'
  const idx = Number(ctx?.sourceItemIndex ?? ctx?.idx ?? 0)

  const wineryType =
    WINERY_TYPE_LABELS[subNavPath] ||
    (String(item?.subNavName || '').includes('洋') ? '洋酒酒庄' : '葡萄酒酒庄')

  const visitLabel = VISIT_LABELS[idx % VISIT_LABELS.length]
  const styleTag = STYLE_TAGS[idx % STYLE_TAGS.length]
  const secondTag = STYLE_TAGS[(idx + 2) % STYLE_TAGS.length]

  const descRaw = String(info?.desc || info?.dialogInfoDesc || '').trim()
  const teaser =
    descRaw.length > 42 ? `${descRaw.slice(0, 42)}…` : descRaw || '澳洲本土酒庄 · 欢迎预约品鉴'

  return {
    wineryType,
    visitLabel,
    styleTags: styleTag === secondTag ? [styleTag] : [styleTag, secondTag],
    teaser
  }
}
