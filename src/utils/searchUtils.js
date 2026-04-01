const SEARCH_TARGET_STORAGE_KEY = 'auswine.search.target'

const normalizeForSearch = (value) => String(value || '').toLowerCase().trim().replace(/\s+/g, ' ')

const tokenizeForSearch = (value) => normalizeForSearch(value).split(' ').filter(Boolean)

const isAsciiToken = (token) => /^[a-z0-9]+$/i.test(token)

const buildEffectiveQueryTokens = (keyword) => {
  const rawTokens = tokenizeForSearch(keyword)
  const compactQuery = normalizeForSearch(keyword).replace(/\s+/g, '')

  // 英文/数字词至少 2 个字符，避免 "r i c h..." 这类输入把单字母当作关键词
  const filtered = rawTokens.filter((token) => {
    if (isAsciiToken(token)) return token.length >= 2
    return token.length >= 1
  })

  // 兜底：若被过滤后为空，且拼接后的查询长度足够，则按整体词匹配（例如 "r i c h m o n d" -> "richmond"）
  if (!filtered.length && compactQuery.length >= 2) {
    return [compactQuery]
  }
  return filtered
}

const flattenInfoText = (info) => {
  if (!info || typeof info !== 'object') return ''
  const parts = []

  if (typeof info.name === 'string') parts.push(info.name)
  if (typeof info.desc === 'string') parts.push(info.desc)

  if (Array.isArray(info.features)) {
    for (const feature of info.features) {
      if (!feature || typeof feature !== 'object') continue
      if (typeof feature.title === 'string') parts.push(feature.title)
      if (typeof feature.desc === 'string') parts.push(feature.desc)
    }
  }

  if (Array.isArray(info.tags)) {
    for (const tag of info.tags) {
      if (typeof tag === 'string') parts.push(tag)
    }
  }

  return parts.join(' ')
}

const flattenWineDataText = (wineData) => {
  if (!wineData || typeof wineData !== 'object') return ''
  const parts = []
  if (typeof wineData.desc === 'string') parts.push(wineData.desc)
  if (Array.isArray(wineData.features)) {
    for (const feature of wineData.features) {
      if (!feature || typeof feature !== 'object') continue
      if (typeof feature.title === 'string') parts.push(feature.title)
      if (typeof feature.desc === 'string') parts.push(feature.desc)
    }
  }
  if (Array.isArray(wineData.tags)) {
    for (const tag of wineData.tags) {
      if (typeof tag === 'string') parts.push(tag)
    }
  }
  return parts.join(' ')
}

const extractItemDesc = (item) => {
  if (typeof item?.desc === 'string' && item.desc.trim()) return item.desc.trim()
  if (typeof item?.wineData?.desc === 'string' && item.wineData.desc.trim()) return item.wineData.desc.trim()
  if (typeof item?.itemData?.desc === 'string' && item.itemData.desc.trim()) return item.itemData.desc.trim()
  if (typeof item?.info?.desc === 'string' && item.info.desc.trim()) return item.info.desc.trim()
  return ''
}

const extractItemTags = (item) => {
  const tags = []
  if (Array.isArray(item?.tags)) {
    for (const tag of item.tags) {
      if (typeof tag === 'string' && tag.trim()) tags.push(tag.trim())
    }
  }
  if (Array.isArray(item?.wineData?.tags)) {
    for (const tag of item.wineData.tags) {
      if (typeof tag === 'string' && tag.trim()) tags.push(tag.trim())
    }
  }
  if (Array.isArray(item?.itemData?.tags)) {
    for (const tag of item.itemData.tags) {
      if (typeof tag === 'string' && tag.trim()) tags.push(tag.trim())
    }
  }
  if (Array.isArray(item?.info?.tags)) {
    for (const tag of item.info.tags) {
      if (typeof tag === 'string' && tag.trim()) tags.push(tag.trim())
    }
  }
  return Array.from(new Set(tags))
}

const buildSearchIndex = (itemJson, sourceType = 'item') => {
  const rows = []

  for (const region of itemJson || []) {
    const navName = region?.navName || ''
    const regionPath = region?.path || ''
    const subNavList = Array.isArray(region?.subNavList) ? region.subNavList : []

    for (const subNav of subNavList) {
      const subNavName = subNav?.subNavName || ''
      const subNavPath = subNav?.subNavPath || ''
      const itemData = Array.isArray(subNav?.info)
        ? subNav.info
        : (Array.isArray(subNav?.itemData) ? subNav.itemData : [])

      itemData.forEach((item, itemIndex) => {
        const title = item?.title || ''
        const enTitle = item?.enTitle || ''
        const subTitle = item?.subTitle || ''
        const desc = extractItemDesc(item)
        const tags = extractItemTags(item)
        const infoText = [flattenInfoText(item?.info), flattenWineDataText(item?.wineData)].join(' ').trim()
        const fullText = [navName, subNavName, title, enTitle, subTitle, desc, tags.join(' '), infoText].join(' ')

        rows.push({
          id: `${sourceType}__${regionPath}__${subNavPath}__${itemIndex}`,
          navName,
          regionPath,
          subNavName,
          subNavPath,
          title,
          enTitle,
          subTitle,
          desc,
          tags,
          infoText,
          fullText,
          image: item?.img || '',
          item,
          itemIndex,
          sourceType
        })
      })
    }
  }

  return rows
}

const containsAllTokens = (targetText, tokens) => tokens.every((token) => targetText.includes(token))

const countTokenHits = (targetText, tokens) => tokens.reduce((acc, token) => (targetText.includes(token) ? acc + 1 : acc), 0)

const indexOfTokenSum = (targetText, tokens) =>
  tokens.reduce((sum, token) => {
    const idx = targetText.indexOf(token)
    return sum + (idx >= 0 ? idx : targetText.length + 1000)
  }, 0)

const scoreRow = (row, keyword) => {
  const queryNorm = normalizeForSearch(keyword)
  const queryTokens = buildEffectiveQueryTokens(keyword)
  const singleAsciiCharQuery = queryNorm.length === 1 && isAsciiToken(queryNorm)
  if (!queryNorm || (!queryTokens.length && !singleAsciiCharQuery)) {
    return { score: 0, matched: false, matchField: '', snippet: '' }
  }

  const fields = [
    { key: 'title', weight: 150, text: row.title || '' },
    { key: 'enTitle', weight: 140, text: row.enTitle || '' },
    { key: 'desc', weight: 95, text: row.desc || '' },
    { key: 'tags', weight: 90, text: Array.isArray(row.tags) ? row.tags.join(' ') : '' },
    { key: 'subNavName', weight: 110, text: row.subNavName || '' },
    { key: 'navName', weight: 100, text: row.navName || '' }
  ]

  let bestScore = -1
  let bestField = ''
  let bestSnippet = ''
  let matched = false

  for (const field of fields) {
    const normText = normalizeForSearch(field.text)
    if (!normText) continue

    // 单字母英文兜底：只允许在高权重可见字段里做“单词前缀命中”，避免噪声太大
    if (singleAsciiCharQuery) {
      const allowSingleCharFallbackField = field.key === 'title' || field.key === 'enTitle' || field.key === 'tags'
      if (!allowSingleCharFallbackField) continue

      const words = normText.split(/[^a-z0-9]+/i).filter(Boolean)
      const prefixHit = words.some((word) => word.startsWith(queryNorm))
      if (!prefixHit) continue

      matched = true
      let score = field.weight + 20
      if (field.key === 'title' || field.key === 'enTitle') score += 20

      if (score > bestScore) {
        bestScore = score
        bestField = field.key
        bestSnippet = field.text
      }
      continue
    }

    const singleAsciiToken = queryTokens.length === 1 && isAsciiToken(queryTokens[0]) && queryTokens[0].length >= 3
    if (singleAsciiToken) {
      const asciiCompactText = normText.replace(/[^a-z0-9]+/gi, '')
      if (!asciiCompactText.includes(queryTokens[0])) continue
    }

    const exactContains = normText.includes(queryNorm) || normText.replace(/\s+/g, '').includes(queryNorm.replace(/\s+/g, ''))
    const allTokensHit = containsAllTokens(normText, queryTokens)
    const tokenHits = countTokenHits(normText, queryTokens)
    const tokenHitRatio = queryTokens.length > 0 ? (tokenHits / queryTokens.length) : 0

    // 匹配门槛：
    // 1) 单词查询必须完整命中（防止少量字母误匹配）
    // 2) 多词查询允许部分命中，但至少命中 2 个词且命中率 >= 60%
    const enoughPartialHit =
      queryTokens.length > 1 &&
      tokenHits >= 2 &&
      tokenHitRatio >= 0.6
    if (!exactContains && !allTokensHit && !enoughPartialHit) continue

    matched = true

    let score = 0
    if (exactContains) score += field.weight * 3
    if (allTokensHit) score += field.weight * 2
    score += tokenHits * field.weight

    // 越靠前越优先
    const posPenalty = Math.min(300, Math.floor(indexOfTokenSum(normText, queryTokens) / 4))
    score -= posPenalty

    // 标题字面更接近时再加分（例如“塔州红酒”优先于“xx红酒”）
    const similarityBonus = Math.max(0, queryNorm.length - Math.abs(normText.length - queryNorm.length))
    score += Math.min(40, similarityBonus)

    if (score > bestScore) {
      bestScore = score
      bestField = field.key
      bestSnippet = field.text
    }
  }

  return {
    score: bestScore,
    matched,
    matchField: bestField,
    snippet: bestSnippet
  }
}

const extractSnippet = (text, keyword, maxLen = 120) => {
  const raw = String(text || '')
  if (!raw) return ''
  const queryNorm = normalizeForSearch(keyword)
  if (!queryNorm) return raw.slice(0, maxLen)

  const rawLower = raw.toLowerCase()
  const idx = rawLower.indexOf(queryNorm)
  if (idx < 0) return raw.slice(0, maxLen)

  const start = Math.max(0, idx - 24)
  const end = Math.min(raw.length, idx + queryNorm.length + 48)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < raw.length ? '...' : ''
  return `${prefix}${raw.slice(start, end)}${suffix}`
}

const getHighlightSegments = (text, keyword) => {
  const raw = String(text || '')
  const query = String(keyword || '').trim()
  if (!query) return [{ text: raw, highlight: false }]

  const lower = raw.toLowerCase()
  const queryNorm = normalizeForSearch(query)
  const singleAsciiCharQuery = queryNorm.length === 1 && isAsciiToken(queryNorm)
  const effectiveTokens = singleAsciiCharQuery ? [queryNorm] : buildEffectiveQueryTokens(query)
  const tokenList = Array.from(new Set(effectiveTokens.sort((a, b) => b.length - a.length)))
  if (!tokenList.length) return [{ text: raw, highlight: false }]

  const marks = []
  for (const token of tokenList) {
    if (!token) continue
    let from = 0
    while (from < lower.length) {
      const idx = lower.indexOf(token, from)
      if (idx < 0) break
      marks.push([idx, idx + token.length])
      from = idx + token.length
    }
  }

  if (!marks.length) return [{ text: raw, highlight: false }]
  marks.sort((a, b) => a[0] - b[0])

  const merged = []
  for (const [start, end] of marks) {
    const last = merged[merged.length - 1]
    if (!last || start > last[1]) {
      merged.push([start, end])
    } else if (end > last[1]) {
      last[1] = end
    }
  }

  const segments = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: raw.slice(cursor, start), highlight: false })
    segments.push({ text: raw.slice(start, end), highlight: true })
    cursor = end
  }
  if (cursor < raw.length) segments.push({ text: raw.slice(cursor), highlight: false })

  return segments.filter((seg) => seg.text)
}

const saveSearchTarget = (payload) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SEARCH_TARGET_STORAGE_KEY, JSON.stringify(payload || {}))
  } catch (_) {
    // ignore
  }
}

const readSearchTarget = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SEARCH_TARGET_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_) {
    return null
  }
}

const clearSearchTarget = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SEARCH_TARGET_STORAGE_KEY)
  } catch (_) {
    // ignore
  }
}

export {
  SEARCH_TARGET_STORAGE_KEY,
  normalizeForSearch,
  tokenizeForSearch,
  buildSearchIndex,
  scoreRow,
  extractSnippet,
  getHighlightSegments,
  saveSearchTarget,
  readSearchTarget,
  clearSearchTarget
}
