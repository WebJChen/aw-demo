const SEARCH_TARGET_STORAGE_KEY = 'auswine.search.target'

const normalizeForSearch = (value) => String(value || '').toLowerCase().trim().replace(/\s+/g, ' ')

const tokenizeForSearch = (value) => normalizeForSearch(value).split(' ').filter(Boolean)

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

const buildSearchIndex = (itemJson) => {
  const rows = []

  for (const region of itemJson || []) {
    const navName = region?.navName || ''
    const regionPath = region?.path || ''
    const subNavList = Array.isArray(region?.subNavList) ? region.subNavList : []

    for (const subNav of subNavList) {
      const subNavName = subNav?.subNavName || ''
      const subNavPath = subNav?.subNavPath || ''
      const itemData = Array.isArray(subNav?.itemData) ? subNav.itemData : []

      itemData.forEach((item, itemIndex) => {
        const title = item?.title || ''
        const enTitle = item?.enTitle || ''
        const subTitle = item?.subTitle || ''
        const infoText = flattenInfoText(item?.info)
        const fullText = [navName, subNavName, title, enTitle, subTitle, infoText].join(' ')

        rows.push({
          id: `${regionPath}__${subNavPath}__${itemIndex}`,
          navName,
          regionPath,
          subNavName,
          subNavPath,
          title,
          enTitle,
          subTitle,
          infoText,
          fullText,
          image: item?.img || '',
          item,
          itemIndex
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
  const queryTokens = tokenizeForSearch(keyword)
  if (!queryNorm || !queryTokens.length) return { score: 0, matched: false, matchField: '', snippet: '' }

  const fields = [
    { key: 'title', weight: 150, text: row.title || '' },
    { key: 'enTitle', weight: 140, text: row.enTitle || '' },
    { key: 'subTitle', weight: 120, text: row.subTitle || '' },
    { key: 'subNavName', weight: 110, text: row.subNavName || '' },
    { key: 'navName', weight: 100, text: row.navName || '' },
    { key: 'infoText', weight: 80, text: row.infoText || '' }
  ]

  let bestScore = -1
  let bestField = ''
  let bestSnippet = ''
  let matched = false

  for (const field of fields) {
    const normText = normalizeForSearch(field.text)
    if (!normText) continue

    const exactContains = normText.includes(queryNorm)
    const allTokensHit = containsAllTokens(normText, queryTokens)
    const tokenHits = countTokenHits(normText, queryTokens)
    if (!exactContains && !allTokensHit && tokenHits === 0) continue

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
  const tokenList = Array.from(new Set(tokenizeForSearch(query).sort((a, b) => b.length - a.length)))
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
