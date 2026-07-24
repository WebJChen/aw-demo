import { isApiEnabled } from '@/utils/auswineApi'
import { searchCatalogRemote } from '@/utils/auswineApi'
import { loadLocalSearchIndexRows } from '@/utils/catalogRepository'
import { scoreRow } from '@/utils/searchUtils'

export const SEARCH_PAGE_SIZE = 10
const MAX_SEARCH_CACHE_SIZE = 32
const searchCache = new Map()

const cleanText = (value) => {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

export function buildSearchSignature(keyword, pageNum = 1, pageSize = SEARCH_PAGE_SIZE, type = 'all') {
  return `${cleanText(keyword)}::${type}::${Number(pageNum) || 1}::${Number(pageSize) || SEARCH_PAGE_SIZE}`
}

function rememberSearchPayload(signature, payload) {
  if (!signature || !payload) return
  if (searchCache.size >= MAX_SEARCH_CACHE_SIZE) {
    const oldest = searchCache.keys().next().value
    searchCache.delete(oldest)
  }
  searchCache.set(signature, payload)
}

export function getCachedSearchPayload(keyword, pageNum = 1, pageSize = SEARCH_PAGE_SIZE, type = 'all') {
  return searchCache.get(buildSearchSignature(keyword, pageNum, pageSize, type)) || null
}

export function clearSearchCache() {
  searchCache.clear()
}

function mapRemoteSearchResult(row) {
  if (!row || typeof row !== 'object') return null
  return {
    id: row.id || row.itemKey,
    score: Number(row.score) || 0,
    navName: row.stateName || row.navName || '',
    regionPath: row.statePath || row.regionPath || '',
    subNavName: row.subNavName || '',
    subNavPath: row.subNavPath || '',
    sectionTag: row.stateName || row.navName || '',
    groupName: row.subNavName || '',
    title: row.title || '',
    enTitle: row.enTitle || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    desc: row.desc || row.snippet || '',
    itemIndex: row.itemIndex ?? row.sourceItemIndex ?? 0,
    itemTitle: row.title || '',
    matchField: row.matchField || '',
    sourceType: row.sourceType || row.type || 'wine',
  }
}

function searchLocalIndex(indexRows, keyword, sourceTypeFilter, pageNum, pageSize) {
  const currentKeyword = cleanText(keyword)
  if (!currentKeyword) {
    return { query: '', total: 0, results: [], pageNum: 1, pageSize }
  }

  const rows = []
  for (const row of indexRows) {
    if (sourceTypeFilter && row.sourceType !== sourceTypeFilter) continue
    const scoreData = scoreRow(row, currentKeyword)
    if (!scoreData.matched) continue
    rows.push({
      id: row.id,
      score: scoreData.score,
      navName: row.navName,
      regionPath: row.regionPath,
      subNavName: row.subNavName,
      subNavPath: row.subNavPath,
      sectionTag: row.navName,
      groupName: row.subNavName,
      title: row.title,
      enTitle: row.enTitle,
      tags: Array.isArray(row.tags) ? row.tags : [],
      desc: row.desc || '',
      itemIndex: row.itemIndex,
      itemTitle: row.title,
      matchField: scoreData.matchField,
      sourceType: row.sourceType,
    })
  }

  rows.sort((a, b) => b.score - a.score)
  const total = rows.length
  const start = (Math.max(1, pageNum) - 1) * pageSize
  const results = rows.slice(start, start + pageSize)

  return {
    query: currentKeyword,
    total,
    results,
    pageNum,
    pageSize,
  }
}

export async function searchCatalog(rawKeyword, {
  type = 'all',
  pageNum = 1,
  pageSize = SEARCH_PAGE_SIZE,
  force = false,
} = {}) {
  const keyword = cleanText(rawKeyword)
  const sourceTypeFilter = type === 'wine' || type === 'item' ? type : ''

  if (!keyword) {
    return { query: '', total: 0, results: [], pageNum: 1, pageSize }
  }

  const signature = buildSearchSignature(keyword, pageNum, pageSize, type)
  if (!force) {
    const cached = searchCache.get(signature)
    if (cached) return cached
  }

  let payload

  if (isApiEnabled()) {
    const data = await searchCatalogRemote(keyword, { type, pageNum, pageSize })
    payload = {
      query: data?.query || keyword,
      pageNum: Number(data?.pageNum || pageNum) || 1,
      pageSize: Number(data?.pageSize || pageSize) || pageSize,
      total: Number(data?.total) || 0,
      results: Array.isArray(data?.results) ? data.results.map(mapRemoteSearchResult).filter(Boolean) : [],
    }
  } else {
    const indexRows = await loadLocalSearchIndexRows()
    payload = searchLocalIndex(indexRows, keyword, sourceTypeFilter, pageNum, pageSize)
  }

  rememberSearchPayload(signature, payload)
  return payload
}
