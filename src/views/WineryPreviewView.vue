<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import CatalogGridShell from '@/components/CatalogGridShell.vue'
import RegionNavMenuCard from '@/components/RegionNavMenuCard.vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { useNavStore } from '@/stores/navStore'
import navData from '@/data/split/nav.json'
import { buildWineGridRoute } from '@/utils/wineGridRoute'
import { buildWineryDetailRouteTarget } from '@/utils/wineryDetailPage'
import { resolveWinerySubNavPath, WINERY_DEFAULT_SUB_NAV } from '@/utils/wineryRouteUtils'
import { getItemRegionByPath } from '@/utils/dataRepository'
import { resolveItemGridImageUrl } from '@/utils/itemImageResolver'
import { buildWineryGridDisplay } from '@/utils/wineryGridExtras'
import {
  matchesCatalogItem,
  readSearchTarget,
  saveSearchTarget
} from '@/utils/searchUtils'
import { buildCatalogHitKey, findCatalogEntryIndexByHitKey } from '@/utils/catalogHitKey'
import {
  AUS_WINE_LOCATION_POSTCODES,
  createLocationLazyLoad,
  getLocationDisplayLabel,
  getLocationSortOrder,
  resolveLocationLabel,
} from '@/utils/ausWineLocationPostcodes'

const INITIAL_RENDER_COUNT = 24
const RENDER_STEP_COUNT = 24

const VISIT_FILTER_OPTIONS = [
  { value: '', label: '参观方式不限' },
  { value: 'cellar', label: '有品鉴室' },
  { value: 'booking', label: '建议预约' },
  { value: 'dining', label: '含餐厅' },
  { value: 'stay', label: '可住宿' }
]

const WINERY_SORT_OPTIONS = [
  { value: 'default', label: '默认排序' },
  { value: 'nameAsc', label: '名称 A→Z' },
  { value: 'nameDesc', label: '名称 Z→A' },
  { value: 'locEn', label: '按英文排序' },
  { value: 'locCn', label: '按中文排序' },
]

const PLACEHOLDER_TAG_RE = /^tag\d+$/i

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()
const navStore = useNavStore()
const { isPhone, isPortrait } = storeToRefs(deviceStore)
const { activeSubNav } = storeToRefs(navStore)

const shellRef = ref(null)
const getGridEl = () => shellRef.value?.getGridEl?.() ?? null
const getLoadMoreEl = () => shellRef.value?.getLoadMoreEl?.() ?? null
const scrollPage = ref(1)
const renderLimit = ref(INITIAL_RENDER_COUNT)
const hasMore = ref(false)
const currentRegionData = ref(null)
const localSearchKeyword = ref('')
const appliedSearchKeyword = ref('')
const wineryFilterVisit = ref('')
const wineryFilterTag = ref('')
const winerySortBy = ref('default')

const selectedLocationKey = ref([])
const selectedLocationLabel = computed(() => {
  const arr = selectedLocationKey.value
  return Array.isArray(arr) && arr.length ? arr[arr.length - 1] : ''
})

const handledSearchHit = ref('')
let hitClearTimer = null
let loadMoreObserver = null
let scrollUpdateFrameId = 0

const regionPath = computed(() => (typeof route.params.regionPath === 'string' ? route.params.regionPath : ''))
const regionTitle = computed(() => currentRegionData.value?.navName || '')
// 【样式测试·可删】tasmania 州酒庄页：首格不展示八州导航；州标题栏在子导航上方
const isTasmaniaWineryLayoutTest = computed(() => regionPath.value === 'tasmania')
const showLeadingNavMenu = computed(() => !isTasmaniaWineryLayoutTest.value)
const navMenuItems = computed(() =>
  navData.slice(0, 8).map((region) => ({
    navName: region?.navName || '',
    regionPath: region?.path || '',
    capitalLabel:
      region?.navName === '堪培拉'
        ? '（首都领地.ACT）'
        : `（首府：${region?.capital || ''}）`
  }))
)

const allSubNavs = computed(() => currentRegionData.value?.subNavList || [])
const enabledSubNavs = computed(() => allSubNavs.value.filter((subNav) => subNav?.isShow !== false))
const subNavList = computed(() => allSubNavs.value.map((subNav) => subNav.subNavName))
const subNavDisabledMap = computed(() =>
  Object.fromEntries(allSubNavs.value.map((subNav) => [subNav.subNavName, subNav?.isShow === false]))
)

const currentSubNav = computed(() => {
  if (!allSubNavs.value.length) return null
  const routeSubNavPath = typeof route.params.subNav === 'string' ? route.params.subNav : ''
  const byRoute = routeSubNavPath
    ? enabledSubNavs.value.find((subNav) => subNav.subNavPath === routeSubNavPath)
    : null
  if (byRoute) return byRoute
  return enabledSubNavs.value[0] || allSubNavs.value[0]
})

const activeSubNavLabel = computed(() => currentSubNav.value?.subNavName || '')

const getSubNavItems = (subNav) => {
  if (Array.isArray(subNav?.itemData)) return subNav.itemData
  if (Array.isArray(subNav?.info)) return subNav.info
  return []
}

const getItemInfo = (item) => item?.info || item?.wineData || item?.itemData || null

const flattenVisitGuideText = (item) => {
  const info = getItemInfo(item) || {}
  if (!Array.isArray(info.visitGuide)) return ''
  return info.visitGuide
    .map((row) => `${row?.label || ''} ${row?.text || ''}`)
    .join(' ')
}

const getWineryTagList = (item) => {
  const info = getItemInfo(item) || {}
  if (!Array.isArray(info.tags)) return []
  return info.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
}

const getWinerySearchBlob = (item) => {
  const info = getItemInfo(item) || {}
  return [
    item?.title,
    item?.enTitle,
    info?.name,
    info?.desc,
    info?.dialogInfoDesc,
    item?.region,
    item?.town,
    getWineryTagList(item).join(' '),
    flattenVisitGuideText(item)
  ]
    .filter(Boolean)
    .join(' ')
}

const matchesWineryKeyword = (item, kwRaw) => {
  const kw = String(kwRaw || '').trim()
  if (!kw) return true
  return matchesCatalogItem(item, kw, {
    title: getWinerySearchBlob(item),
    navName: regionTitle.value,
    subNavName: currentSubNav.value?.subNavName || item?.subNavName || ''
  })
}

const matchesWineryVisit = (item, visitFilter) => {
  if (!visitFilter) return true
  const hay = `${getWinerySearchBlob(item)} ${flattenVisitGuideText(item)}`.toLowerCase()
  switch (visitFilter) {
    case 'cellar':
      return /cellar|品鉴|品饮|tasting|试饮/.test(hay)
    case 'booking':
      return /预约|booking|reservation|需预约|建议提前/.test(hay)
    case 'dining':
      return /eatery|餐厅|restaurant|厨房|午餐|晚餐|餐食/.test(hay)
    case 'stay':
      return /住宿|stay|vineyard house|bnb|留宿|过夜/.test(hay)
    default:
      return true
  }
}

const matchesWineryTag = (item, tagFilter) => {
  if (!tagFilter) return true
  return getWineryTagList(item).some((tag) => tag === tagFilter)
}

const matchesWineryLocation = (item, locLabel) => {
  if (!locLabel) return true
  return resolveLocationLabel(item) === locLabel
}

const locationCascaderProps = computed(() => {
  const currentItems = buildEntryListForSubNav(currentSubNav.value).map((entry) => entry.data)
  const modeMap = { default: 'postcode', locPostcode: 'postcode', locEn: 'nameEn', locCn: 'nameZh' }
  return {
    lazy: true,
    lazyLoad: createLocationLazyLoad(currentItems, modeMap[winerySortBy.value] || 'postcode'),
    showAllLevels: false,
  }
})

const compareWineryTitle = (a, b) => {
  const titleA = String(a?.data?.title || a?.data?.enTitle || '').trim()
  const titleB = String(b?.data?.title || b?.data?.enTitle || '').trim()
  return titleA.localeCompare(titleB, 'zh-CN', { sensitivity: 'base' })
}

const sortWineryEntries = (entries, sortBy) => {
  const rows = [...entries]
  if (sortBy === 'nameAsc') return rows.sort(compareWineryTitle)
  if (sortBy === 'nameDesc') return rows.sort((a, b) => compareWineryTitle(b, a))
  return rows
}

const availableTagOptions = computed(() => {
  const subNav = currentSubNav.value
  if (!subNav) return []
  const tagCount = new Map()
  getSubNavItems(subNav).forEach((item) => {
    getWineryTagList(item).forEach((tag) => {
      if (PLACEHOLDER_TAG_RE.test(tag)) return
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
    })
  })
  return [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([label]) => ({ value: label, label }))
})

const buildEntryListForSubNav = (subNav) => {
  if (!subNav) return []
  return getSubNavItems(subNav).map((data, sourceItemIndex) => ({
    data,
    regionPath: regionPath.value,
    regionNavName: currentRegionData.value?.navName || '',
    subNavPath: subNav.subNavPath,
    subNavName: subNav.subNavName,
    sourceItemIndex
  }))
}

const buildHitKeyForEntry = (entry) => {
  if (!entry) return ''
  return buildCatalogHitKey('item', entry.regionPath, entry.subNavPath, entry.data, entry.sourceItemIndex)
}

function getLocationDisplayName(item) {
  const label = resolveLocationLabel(item)
  const sortBy = winerySortBy.value
  const modeMap = { default: 'postcode', locPostcode: 'postcode', locEn: 'nameEn', locCn: 'nameZh' }
  return getLocationDisplayLabel(label, modeMap[sortBy] || 'postcode')
}

function getLocationTown(item) {
  const label = resolveLocationLabel(item)
  if (!label) return ''
  const lastSpace = label.lastIndexOf(' ')
  return lastSpace > 0 ? label.slice(0, lastSpace) : label
}

function getLocationNameZh(item) {
  const label = resolveLocationLabel(item)
  if (!label) return ''
  const found = AUS_WINE_LOCATION_POSTCODES.find((e) => e.label === label)
  return found ? found.nameZh || '' : ''
}

function getLocationPostcode(item) {
  const label = resolveLocationLabel(item)
  if (!label) return ''
  const lastSpace = label.lastIndexOf(' ')
  return lastSpace > 0 ? label.slice(lastSpace + 1) : ''
}

function sortByLocation(items) {
  const sortBy = winerySortBy.value
  const modeMap = { default: 'postcode', locPostcode: 'postcode', locEn: 'nameEn', locCn: 'nameZh' }
  const mode = modeMap[sortBy] || 'postcode'
  const list = Array.isArray(items) ? [...items] : []
  return list.sort((a, b) => {
    const orderDiff = getLocationSortOrder(a.data, mode) - getLocationSortOrder(b.data, mode)
    if (orderDiff !== 0) return orderDiff
    return String(a.data?.title || '').localeCompare(String(b.data?.title || ''), 'zh-Hans-CN')
  })
}

function shouldShowLocationTitle(list, index) {
  if (!Array.isArray(list) || !list.length) return false
  if (index === 0) return true
  return getLocationDisplayName(list[index].data) !== getLocationDisplayName(list[index - 1].data)
}

const isLocationSortMode = (sortBy) =>
  sortBy === 'default' || sortBy === 'locPostcode' || sortBy === 'locEn' || sortBy === 'locCn'

const dataList = computed(() => {
  const subNav = currentSubNav.value
  if (!subNav) return []

  const kw = appliedSearchKeyword.value
  const visitFilter = wineryFilterVisit.value
  const tagFilter = wineryFilterTag.value
  const sortBy = winerySortBy.value
  const locLabel = selectedLocationLabel.value

  const rows = buildEntryListForSubNav(subNav).filter((entry) => {
    const item = entry.data
    if (!matchesWineryKeyword(item, kw)) return false
    if (!matchesWineryVisit(item, visitFilter)) return false
    if (!matchesWineryTag(item, tagFilter)) return false
    if (!matchesWineryLocation(item, locLabel)) return false
    return true
  })

  if (isLocationSortMode(sortBy)) {
    return sortByLocation(rows)
  }
  return sortWineryEntries(rows, sortBy)
})

const hasActiveWineryFilters = computed(() => {
  return (
    !!appliedSearchKeyword.value.trim() ||
    !!wineryFilterVisit.value ||
    !!wineryFilterTag.value ||
    !!selectedLocationLabel.value ||
    winerySortBy.value !== 'default'
  )
})

const filteredDataTotal = computed(() => dataList.value.length)
const visibleDataList = computed(() => dataList.value.slice(0, renderLimit.value))

const gridRows = computed(() =>
  visibleDataList.value.map((entry, idx) => ({
    entry,
    data: entry.data,
    idx,
    display: buildWineryGridDisplay(entry.data, {
      subNavPath: entry.subNavPath,
      sourceItemIndex: entry.sourceItemIndex,
      idx
    })
  }))
)

const eachPageCount = computed(() => {
  if (isPhone.value) return isPortrait.value ? 3 : 2
  return 12
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredDataTotal.value / eachPageCount.value)))

const resetRenderLimit = () => {
  renderLimit.value = INITIAL_RENDER_COUNT
}

const updateHasMore = () => {
  hasMore.value = renderLimit.value < filteredDataTotal.value
}

const loadMoreItems = () => {
  if (!hasMore.value) return
  renderLimit.value = Math.min(filteredDataTotal.value, renderLimit.value + RENDER_STEP_COUNT)
  updateHasMore()
}

const initLoadMoreObserver = (retry = 0) => {
  if (typeof window === 'undefined') return
  if (!('IntersectionObserver' in window)) return
  const loadMoreEl = getLoadMoreEl()
  if (!loadMoreEl) {
    if (retry < 4) nextTick(() => initLoadMoreObserver(retry + 1))
    return
  }

  if (loadMoreObserver) loadMoreObserver.disconnect()
  loadMoreObserver = new IntersectionObserver((entries) => {
    if (!entries?.length) return
    const [entry] = entries
    if (!entry?.isIntersecting) return
    loadMoreItems()
  }, {
    root: null,
    rootMargin: '500px 0px 500px 0px',
    threshold: 0
  })
  loadMoreObserver.observe(loadMoreEl)
}

const teardownLoadMoreObserver = () => {
  if (!loadMoreObserver) return
  loadMoreObserver.disconnect()
  loadMoreObserver = null
}

const openWineryPreviewInNewWindow = (menuItem) => {
  const regionPathValue = menuItem?.regionPath
  if (!regionPathValue) return
  const region = navData.find((item) => item?.path === regionPathValue)
  const firstSubNav = region?.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath || WINERY_DEFAULT_SUB_NAV
  const href = router.resolve({
    name: 'WineryPreview',
    params: {
      regionPath: regionPathValue,
      subNav: firstSubNav
    }
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

/** 酒款首页（勿用 name: Home，路由守卫会按 lastVisitedRoute 拉回酒庄页） */
const goHome = () => {
  router.push(buildWineGridRoute({ activeSubNavName: activeSubNav.value }))
}

const goBackToWineGrid = () => {
  const routeTarget = buildWineGridRoute({ activeSubNavName: activeSubNav.value })
  const href = router.resolve(routeTarget).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

const openWineryDetailInNewWindow = (entry) => {
  const rp = entry?.regionPath || regionPath.value
  const sp = entry?.subNavPath || currentSubNav.value?.subNavPath
  const idx = entry?.sourceItemIndex
  if (!rp || !sp || idx == null) return
  const href = router.resolve(buildWineryDetailRouteTarget(rp, sp, idx)).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

const clearSearchHitState = () => {
  if (hitClearTimer) {
    clearTimeout(hitClearTimer)
    hitClearTimer = null
  }
  const highlighted = getGridEl()?.querySelectorAll?.('.search-hit-active') || []
  highlighted.forEach((el) => el.classList.remove('search-hit-active'))
}

const playSearchHitHighlight = (targetEl, fallbackMs = 1800) => {
  return new Promise((resolve) => {
    if (!targetEl) {
      resolve()
      return
    }

    clearSearchHitState()
    targetEl.classList.add('search-hit-active')

    let done = false
    const cleanup = () => {
      if (done) return
      done = true
      targetEl.removeEventListener('animationend', onAnimationEnd)
      targetEl.classList.remove('search-hit-active')
      if (hitClearTimer) {
        clearTimeout(hitClearTimer)
        hitClearTimer = null
      }
      resolve()
    }

    const onAnimationEnd = () => cleanup()
    targetEl.addEventListener('animationend', onAnimationEnd)
    hitClearTimer = setTimeout(cleanup, fallbackMs)
  })
}

const waitForSearchTargetReady = (hitKey, maxFrames = 180) => {
  return new Promise((resolve) => {
    let frame = 0
    const check = () => {
      const targetEl = getGridEl()?.querySelector?.(`[data-hit-key="${hitKey}"]`) || null
      if (targetEl || frame >= maxFrames) {
        resolve(targetEl)
        return
      }
      frame += 1
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

const notifySearchHitDone = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auswine:search-hit-done'))
}

const handleSearchTargetFocus = async () => {
  const routeHit = typeof route.query.hit === 'string' ? route.query.hit : ''
  const persisted = readSearchTarget()
  const canUsePersistedHit = !routeHit && persisted?.pending === true && typeof persisted?.hit === 'string'
  const rawTargetHit = routeHit || (canUsePersistedHit ? persisted.hit : '')
  const targetHit = rawTargetHit?.startsWith('item__') ? rawTargetHit : ''
  if (!targetHit || handledSearchHit.value === targetHit) return

  const hitParts = targetHit.split('__')
  const hitRegionPath = hitParts[1] || ''
  const hitSubNavPath = hitParts[2] || ''

  if (hitRegionPath && hitRegionPath !== regionPath.value) {
    await router.replace({
      name: 'WineryPreview',
      params: {
        regionPath: hitRegionPath,
        subNav: resolveWinerySubNavPath(hitSubNavPath, currentRegionData.value)
      },
      query: { ...route.query }
    })
    return
  }

  const resolvedHitSubNav = resolveWinerySubNavPath(hitSubNavPath, currentRegionData.value)
  if (resolvedHitSubNav && resolvedHitSubNav !== currentSubNav.value?.subNavPath) {
    await router.replace({
      name: 'WineryPreview',
      params: { regionPath: regionPath.value, subNav: resolvedHitSubNav },
      query: { ...route.query }
    })
    return
  }

  localSearchKeyword.value = ''
  appliedSearchKeyword.value = ''

  const allEntries = buildEntryListForSubNav(currentSubNav.value)
  const targetIndex = findCatalogEntryIndexByHitKey(allEntries, targetHit, buildHitKeyForEntry)
  if (targetIndex < 0) return

  const targetVisibleCount = Math.max(
    INITIAL_RENDER_COUNT,
    (Math.floor(targetIndex / RENDER_STEP_COUNT) + 1) * RENDER_STEP_COUNT
  )
  renderLimit.value = Math.min(allEntries.length, targetVisibleCount)
  updateHasMore()

  await nextTick()
  const targetEl = await waitForSearchTargetReady(targetHit)
  if (!targetEl) return

  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  void targetEl.offsetWidth
  await playSearchHitHighlight(targetEl)
  notifySearchHitDone()

  handledSearchHit.value = targetHit
  if (persisted || routeHit) {
    saveSearchTarget({
      ...(persisted || {}),
      hit: targetHit,
      pending: false,
      lastHandledHit: targetHit,
      lastHandledAt: Date.now()
    })
  }
}

const getImageLoading = (index) => (index < 8 ? 'eager' : 'lazy')
const getImageFetchPriority = (index) => (index < 8 ? 'high' : 'low')

const syncRegionData = async () => {
  const path = regionPath.value
  if (!path) {
    currentRegionData.value = null
    return
  }
  const loaded = await getItemRegionByPath(path)
  if (path !== regionPath.value) return
  currentRegionData.value = loaded || navData.find((region) => region.path === path) || null
}

const normalizeSubNavRoute = () => {
  if (!regionPath.value || !enabledSubNavs.value.length) return
  const routeSubNavPath = typeof route.params.subNav === 'string' ? route.params.subNav : ''
  const resolvedSubNav = resolveWinerySubNavPath(routeSubNavPath, currentRegionData.value)
  const byRoute = enabledSubNavs.value.find((subNav) => subNav.subNavPath === resolvedSubNav)
  const fallback = enabledSubNavs.value[0]
  if (!fallback) return
  if (!routeSubNavPath || routeSubNavPath !== resolvedSubNav || !byRoute) {
    router.replace({
      name: 'WineryPreview',
      params: {
        regionPath: regionPath.value,
        subNav: resolveWinerySubNavPath(routeSubNavPath, currentRegionData.value)
      }
    })
  }
}

const handleSubNavClick = (subItem) => {
  if (subNavDisabledMap.value[subItem]) return
  const targetSubNav = enabledSubNavs.value.find((subNav) => subNav.subNavName === subItem)
  if (!targetSubNav || !regionPath.value) return
  router.replace({
    name: 'WineryPreview',
    params: {
      regionPath: regionPath.value,
      subNav: targetSubNav.subNavPath
    }
  })
}

const applyLocalSearch = () => {
  appliedSearchKeyword.value = localSearchKeyword.value.trim()
  resetRenderLimit()
  nextTick(() => {
    updateHasMore()
    initLoadMoreObserver()
    scheduleUpdateScrollPage()
  })
}

const executeSearch = async () => {
  applyLocalSearch()
}

const onSearchClear = () => {
  localSearchKeyword.value = ''
  appliedSearchKeyword.value = ''
  resetRenderLimit()
  nextTick(() => {
    updateHasMore()
    initLoadMoreObserver()
    scheduleUpdateScrollPage()
  })
}

const resetSearchFiltersAndView = () => {
  localSearchKeyword.value = ''
  appliedSearchKeyword.value = ''
  wineryFilterVisit.value = ''
  wineryFilterTag.value = ''
  winerySortBy.value = 'default'
  selectedLocationKey.value = []
  resetRenderLimit()
  nextTick(() => {
    updateHasMore()
    initLoadMoreObserver()
    scheduleUpdateScrollPage()
  })
}

function updateScrollPage() {
  const grid = getGridEl()
  if (!grid) return
  const totalShown = Math.min(renderLimit.value, filteredDataTotal.value)
  if (totalShown <= 0) {
    scrollPage.value = 1
    return
  }
  const per = eachPageCount.value || 1
  const pages = Math.max(1, Math.ceil(filteredDataTotal.value / per))
  const rect = grid.getBoundingClientRect()
  const gridTop = rect.top + window.pageYOffset
  const scrollOffset = window.scrollY - gridTop
  if (scrollOffset <= 0) {
    scrollPage.value = 1
    return
  }
  const totalHeight = grid.scrollHeight
  if (totalHeight <= 0) {
    scrollPage.value = 1
    return
  }
  const pageHeight = (totalHeight / totalShown) * per
  const page = Math.ceil(scrollOffset / pageHeight) + 1
  scrollPage.value = Math.min(pages, Math.max(1, page))
}

const scheduleUpdateScrollPage = () => {
  if (scrollUpdateFrameId) return
  scrollUpdateFrameId = requestAnimationFrame(() => {
    scrollUpdateFrameId = 0
    updateScrollPage()
  })
}

const handleWindowScroll = () => {
  scheduleUpdateScrollPage()
}

watch(() => route.params.regionPath, () => {
  void syncRegionData().then(() => {
    normalizeSubNavRoute()
    resetRenderLimit()
    updateHasMore()
    nextTick(() => initLoadMoreObserver())
  })
})

watch(() => route.params.subNav, () => {
  clearSearchHitState()
  resetRenderLimit()
  updateHasMore()
  nextTick(() => {
    initLoadMoreObserver()
    handleSearchTargetFocus()
  })
})

watch(() => route.query.hit, () => {
  if (typeof route.query.hit !== 'string' || !route.query.hit) return
  handledSearchHit.value = ''
  nextTick(() => {
    handleSearchTargetFocus()
  })
})

watch(
  [wineryFilterVisit, wineryFilterTag, winerySortBy],
  () => {
    resetRenderLimit()
    nextTick(() => {
      updateHasMore()
      initLoadMoreObserver()
      scheduleUpdateScrollPage()
    })
  }
)

watch(availableTagOptions, (options) => {
  if (!wineryFilterTag.value) return
  if (!options.some((opt) => opt.value === wineryFilterTag.value)) {
    wineryFilterTag.value = ''
  }
})

watch(() => currentSubNav.value?.subNavPath, () => {
  wineryFilterTag.value = ''
  wineryFilterVisit.value = ''
})

watch(filteredDataTotal, () => {
  updateHasMore()
  nextTick(() => initLoadMoreObserver())
})

onMounted(() => {
  deviceStore.startListen()
  void syncRegionData().then(() => {
    normalizeSubNavRoute()
    resetRenderLimit()
    updateHasMore()
    nextTick(() => {
      initLoadMoreObserver()
      updateScrollPage()
      handleSearchTargetFocus()
    })
  })
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
})

onUnmounted(() => {
  clearSearchHitState()
  teardownLoadMoreObserver()
  if (scrollUpdateFrameId) {
    cancelAnimationFrame(scrollUpdateFrameId)
    scrollUpdateFrameId = 0
  }
  deviceStore.stopListen()
  window.removeEventListener('scroll', handleWindowScroll)
})
</script>

<template>
  <CatalogGridShell ref="shellRef" variant="winery" :sub-nav-items="subNavList" :active-sub-nav="activeSubNavLabel"
    :sub-nav-disabled-map="subNavDisabledMap" :toolbar-before-sub-nav="isTasmaniaWineryLayoutTest"
    :show-grid="filteredDataTotal > 0" :has-more="hasMore" :show-pagination="filteredDataTotal > 0"
    :scroll-page="scrollPage" :total-pages="totalPages" @sub-nav-select="handleSubNavClick">
    <template #filter>
      <div class="wine-filter-toolbar wine-filter-toolbar--winery">
        <el-input v-model="localSearchKeyword" class="wine-filter-search" size="large" clearable
          placeholder="搜索酒庄名称、简介、标签…" @keyup.enter="executeSearch" @clear="onSearchClear">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
          <template #append>
            <el-button type="primary" class="wine-filter-submit" @click="executeSearch">搜索</el-button>
          </template>
        </el-input>
        <el-select v-model="wineryFilterVisit" class="wine-filter-select" size="large" clearable placeholder="参观方式">
          <el-option v-for="opt in VISIT_FILTER_OPTIONS" :key="'v-' + String(opt.value)" :label="opt.label"
            :value="opt.value" />
        </el-select>
        <el-select v-model="wineryFilterTag" class="wine-filter-select" size="large" clearable filterable
          placeholder="特色标签" :disabled="!availableTagOptions.length">
          <el-option label="标签不限" value="" />
          <el-option v-for="opt in availableTagOptions" :key="'t-' + opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-select v-model="winerySortBy" class="wine-filter-select wine-filter-select--sort" size="large"
          placeholder="排序">
          <el-option v-for="opt in WINERY_SORT_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-cascader v-model="selectedLocationKey" :props="locationCascaderProps" clearable filterable
          placeholder="地点（邮编）" class="wine-filter-select" size="large" :key="'winery-loc-' + winerySortBy" />
        <el-button size="large" class="wine-filter-reset" @click="resetSearchFiltersAndView">重置</el-button>
      </div>
      <p class="wine-filter-hint">
        <span v-if="hasActiveWineryFilters">筛选结果 · </span>
        <span v-else>本栏共 </span>
        <strong>{{ filteredDataTotal }}</strong> 家酒庄
      </p>
    </template>

    <template #grid-toolbar>
      <div class="catalog-page-toolbar">
        <!-- 【样式测试·可删】仅 tasmania：州酒庄列表标题栏 + 返回酒款信息，在子导航上方 -->
        <div v-if="isTasmaniaWineryLayoutTest" class="catalog-page-toolbar catalog-page-toolbar--tasmania">
          <div class="back-to-wine-grid-btn w100 catalog-page-toolbar__title">
            {{ regionTitle }}酒庄列表
          </div>
          <button type="button" class="back-to-wine-grid-btn back-to-wine-grid-btn--plain w100"
            @click="goBackToWineGrid">
            <span class="back-to-wine-grid-btn__arrow" aria-hidden="true">‹</span>
            返回首页
          </button>
        </div>
        <div v-else class="catalog-page-toolbar catalog-page-toolbar--winery-nav">
          <button type="button" class="winery-nav-pager-btn winery-nav-pager-btn--prev">
            上一页
          </button>
          <button type="button" class="winery-nav-home-btn" @click="goHome">
            返回首页
          </button>
          <button type="button" class="winery-nav-pager-btn winery-nav-pager-btn--next">
            下一页
          </button>
        </div>
      </div>
    </template>

    <template #items>
      <!-- 非 tasmania 州：八州导航作为网格第一个格子 -->
      <RegionNavMenuCard v-if="showLeadingNavMenu" :nav-menu-items="navMenuItems" :active-region-path="regionPath"
        @select="openWineryPreviewInNewWindow" />
      <template v-for="(row, i) in gridRows"
        :key="`${row.entry?.regionPath || ''}-${row.entry?.subNavPath || ''}-${row.entry?.sourceItemIndex ?? row.idx}`">
        <div v-if="shouldShowLocationTitle(gridRows, i)" class="info-item location-card">
          <div class="location-card__bg" :style="`background-image: url(${resolveItemGridImageUrl(row.data)})`"></div>
          <div class="location-card__overlay">
            <span v-if="winerySortBy === 'locCn'" class="location-card__namezh">{{ getLocationNameZh(row.data) }}</span>
            <span class="location-card__town">{{ getLocationTown(row.data) }}</span>
            <span class="location-card__postcode">{{ getLocationPostcode(row.data) }}</span>
          </div>
        </div>
        <div class="info-item pointer" :data-title="row.data.title" :data-hit-key="buildHitKeyForEntry(row.entry)"
          @click="openWineryDetailInNewWindow(row.entry)">
          <div class="info-img-wrap bgfff">
            <img :src="resolveItemGridImageUrl(row.data)" :alt="row.data.title" class="w100"
              :loading="getImageLoading(row.idx)" decoding="async" :fetchpriority="getImageFetchPriority(row.idx)">
          </div>
          <div class="info-title fs16" :title="row.data.title">{{ row.data.title }}</div>
          <div v-if="row.data.enTitle" class="info-sub info-sub--under-title" :title="row.data.enTitle">
            {{ row.data.enTitle }}
          </div>
          <div class="info-meta-line info-meta-line--winery">
            <span class="info-meta-chip info-meta-chip--type">{{ row.display.wineryType }}</span>
            <span class="info-meta-chip info-meta-chip--visit">{{ row.display.visitLabel }}</span>
            <span v-for="tag in row.display.styleTags" :key="tag" class="info-meta-chip info-meta-chip--tag">{{ tag
            }}</span>
          </div>
          <p class="info-winery-teaser" :title="row.display.teaser">{{ row.display.teaser }}</p>
        </div>
      </template>
    </template>

    <template #empty>
      <div class="wine-grid-empty">
        <p>暂无符合当前筛选的酒庄。</p>
        <p class="wine-grid-empty-sub">请尝试重置条件，或修改搜索关键词。</p>
        <el-button type="primary" class="wine-grid-empty-reset" @click="resetSearchFiltersAndView">重置筛选</el-button>
      </div>
    </template>
  </CatalogGridShell>
</template>

<style>
.info-list .info-item.location-card {
  padding: 0 !important;
  gap: 0 !important;
  border: none !important;
  border-radius: 8px;
  cursor: default;
  background: none !important;
}

.info-list .info-item.location-card:hover {
  border: none !important;
  box-shadow: none !important;
  transform: none !important;
  background: none !important;
}

.location-card {
  position: relative;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  border-radius: 8px;
}

.location-card__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.location-card__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  padding: 24px 20px;
  box-sizing: border-box;
}

.location-card__town {
  font-size: 34px;
  font-weight: 800;
  color: #333;
  letter-spacing: 0.5px;
  line-height: 1.3;
  font-family: Georgia, 'Times New Roman', serif;
}

.location-card__namezh {
  font-size: 34px;
  font-weight: 800;
  color: #333;
  letter-spacing: 0.5px;
  line-height: 1.3;
  font-family: 'Source Han Serif SC', 'Noto Serif SC', 'SimSun', 'STSong', serif;
}

.location-card__postcode {
  font-size: 26px;
  font-weight: 700;
  color: #a8163c;
  letter-spacing: 2px;
  line-height: 1.3;
  font-family: 'Courier New', Consolas, monospace;
}
</style>
