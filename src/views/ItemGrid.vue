<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import CatalogGridShell from '@/components/CatalogGridShell.vue'
import RegionNavMenuCard from '@/components/RegionNavMenuCard.vue'
const ItemDataDialog = defineAsyncComponent(() => import('@/components/dialogs/page/home/ItemDataDialog.vue'))
import { useDeviceStore } from '@/stores/deviceStore';
import { useNavStore } from '@/stores/navStore';
import { useCartStore } from '@/stores/cartStore'
import { useDialogStore } from '@/stores/dialogStore'
import navData from '@/data/split/nav.json';
import itemData from '@/data/item.json';
import {
  readSearchTarget,
  saveSearchTarget,
  buildSearchResultsRoute,
  SEARCH_SOURCE_WINE,
  matchesWineCatalogItem
} from '@/utils/searchUtils'
import { WINERY_DEFAULT_SUB_NAV } from '@/utils/wineryRouteUtils'
import { buildCatalogHitKey, findCatalogEntryIndexByHitKey } from '@/utils/catalogHitKey'
import { withRandomLoading } from '@/utils/loadingUtils'
import { resolveItemGridImageUrl } from '@/utils/itemImageResolver'
import { getAllWineRegions } from '@/utils/dataRepository'
import { buildWineDisplay } from '@/utils/wineGridExtras'
import {
  WINE_GRID_ROUTE_NAME,
  buildWineGridRoute,
  isLegacyWineRegionRouteName
} from '@/utils/wineGridRoute'
/** 【样式测试·可删】见 @/utils/tasmaniaGridStyleTestThumbs.js；正式环境移除该 import 与本页 isTasmaniaGridStyleTestThumb、gridItemThumbSrc、相关 class/样式 */
import { tasGridStyleTestThumbByIndex } from '@/utils/tasmaniaGridStyleTestThumbs'

const GRID_PRICE_COLOR = '#a8163c'

const splitIntoGridPriceParts = (num, currencySym) => {
  const n = Number(num)
  const safe = Number.isFinite(n) && n >= 0 ? n : 0
  const s = Math.abs(safe).toFixed(2)
  const [intPart, dec] = s.split('.')
  return {
    intPart,
    fraction: dec !== '00' ? dec : null,
    currency: currencySym
  }
}

/*
// —— 以下为从 JSON / 条目读取货币与价格（恢复时请取消本段注释，并把 gridRows 里的 priceParts 改为 getGridPriceParts(data)）——
const DISPLAY_DEFAULT_CURRENCY = '¥'
const CURRENCY_SYMBOLS = {
  CNY: '¥',
  RMB: '¥',
  AUD: 'A$',
  USD: '$',
  EUR: '€',
  GBP: '£'
}

const resolveGridCurrencySymbol = (item) => {
  if (!item || typeof item !== 'object') return DISPLAY_DEFAULT_CURRENCY
  const rawSym = typeof item.currencySymbol === 'string' ? item.currencySymbol.trim() : ''
  if (rawSym) return rawSym
  const code = String(item.currency || item.priceCurrency || '').trim().toUpperCase()
  if (code && CURRENCY_SYMBOLS[code]) return CURRENCY_SYMBOLS[code]
  return DISPLAY_DEFAULT_CURRENCY
}

const parseGridPriceNumber = (item) => {
  if (!item || typeof item !== 'object') return null
  const raw = item.price ?? item.testPrice ?? item.displayPrice
  if (raw === undefined || raw === null || raw === '') return null
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

const getGridPriceParts = (item) => {
  const num = parseGridPriceNumber(item)
  if (num === null) return null
  const s = Math.abs(num).toFixed(2)
  const [intPart, dec] = s.split('.')
  return {
    intPart,
    fraction: dec !== '00' ? dec : null,
    currency: resolveGridCurrencySymbol(item)
  }
}
*/
const isWineCatalogRoute = (routeName) =>
  routeName === WINE_GRID_ROUTE_NAME
  || routeName === 'Home'
  || isLegacyWineRegionRouteName(routeName)
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
const INITIAL_RENDER_COUNT = 24
const RENDER_STEP_COUNT = 24

const shellRef = ref(null)
const getGridEl = () => shellRef.value?.getGridEl?.() ?? null
const getLoadMoreEl = () => shellRef.value?.getLoadMoreEl?.() ?? null

const currentPage = ref(1)
const scrollPage = ref(1)
const loadMoad = ref(false)
const isLoading = ref(false)
const renderLimit = ref(INITIAL_RENDER_COUNT)
const hasMore = ref(false)
const deviceStore = useDeviceStore()
const { isPhone, isPortrait } = storeToRefs(deviceStore)
const navStore = useNavStore()
const { activeSubNav } = storeToRefs(navStore)
const cartStore = useCartStore()
const dialogStore = useDialogStore()
const route = useRoute()
const router = useRouter()

const openWineryPreviewInNewWindow = (menuItem) => {
  const targetRegionPath = menuItem?.regionPath
  if (!targetRegionPath) return
  const region = (Array.isArray(itemData) ? itemData : []).find((item) => item?.path === targetRegionPath)
  const firstSubNav = region?.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath || WINERY_DEFAULT_SUB_NAV
  const href = router.resolve({
    name: 'WineryPreview',
    params: { regionPath: targetRegionPath, subNav: firstSubNav }
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

const itemDialogVisible = computed({
  get: () => dialogStore.dialogs.wineItemDetail?.show === true,
  set: (v) =>
    v ? dialogStore.openDialog('wineItemDetail') : dialogStore.closeDialog('wineItemDetail')
})
const selectedItem = ref(null)
const allWineRegionsData = ref([])
const selectedItemRegionNavName = ref('')

const handledSearchHit = ref('')
let hitClearTimer = null
let loadMoreObserver = null
let scrollUpdateFrameId = 0

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
    targetEl.addEventListener('animationend', onAnimationEnd, { once: true })

    // 兜底：动画事件异常时也能继续后续流程
    hitClearTimer = setTimeout(cleanup, fallbackMs)
  })
}


const wineSubNavCatalogRegion = computed(() => allWineRegionsData.value[0] || null)

const allSubNavs = computed(() => wineSubNavCatalogRegion.value?.subNavList || [])
const enabledSubNavs = computed(() => allSubNavs.value.filter((subNav) => subNav?.isShow !== false))

const subNavList = computed(() => allSubNavs.value.map((subNav) => subNav.subNavName))
const subNavDisabledMap = computed(() => {
  return Object.fromEntries(allSubNavs.value.map((subNav) => [subNav.subNavName, subNav?.isShow === false]))
})

const currentSubNav = computed(() => {
  if (!allSubNavs.value.length) return null
  const byRoute = typeof route.params.subNav === 'string'
    ? enabledSubNavs.value.find((subNav) => subNav.subNavPath === route.params.subNav)
    : null
  if (byRoute) return byRoute

  const byStore = enabledSubNavs.value.find((subNav) => subNav.subNavName === activeSubNav.value)
  return byStore || enabledSubNavs.value[0] || allSubNavs.value[0]
})

/** 【样式测试·可删】塔斯马尼亚酒款：列表缩略图用 tasGridStyleTestThumbByIndex */
const isTasmaniaGridEntry = (entry) => entry?.regionPath === 'tasmania'

const dataList = computed(() => {
  const subNavPath = currentSubNav.value?.subNavPath
  if (!subNavPath) return []

  const rows = []
  allWineRegionsData.value.forEach((region) => {
    const subNav = region?.subNavList?.find(
      (item) => item?.subNavPath === subNavPath && item?.isShow !== false
    )
    if (!Array.isArray(subNav?.itemData)) return

    subNav.itemData.forEach((data, sourceItemIndex) => {
      rows.push({
        data,
        regionPath: region.path,
        regionNavName: region.navName,
        subNavPath: subNav.subNavPath,
        subNavName: subNav.subNavName,
        sourceItemIndex
      })
    })
  })
  return rows
})

/** —— 酒款筛选 / 排序（参考 tto-demo TripsGrid 搜索 + 多条件下拉，样式独立）—— */
const localWineSearchKeyword = ref('')
const appliedWineSearchKeyword = ref('')
const wineFilterState = ref('')
const wineFilterPriceTier = ref('')
const wineSortBy = ref('default')

const WINE_FILTER_STATE_OPTIONS = navData.slice(0, 8).map((region) => ({
  value: region?.navName || '',
  label: region?.navName || ''
})).filter((opt) => opt.value)

const WINE_FILTER_PRICE_OPTIONS = [
  { value: '', label: '价格不限' },
  { value: 'lt200', label: '¥200 以下' },
  { value: '200400', label: '¥200 – ¥400' },
  { value: '400800', label: '¥400 – ¥800' },
  { value: 'gt800', label: '¥800 以上' }
]

const WINE_SORT_OPTIONS = [
  { value: 'default', label: '综合排序' },
  { value: 'priceAsc', label: '价格从低到高' },
  { value: 'priceDesc', label: '价格从高到低' },
  { value: 'ratingDesc', label: '评分优先' },
  { value: 'salesDesc', label: '销量优先' }
]

const parseWineTxnSalesApprox = (txnLine) => {
  if (!txnLine || typeof txnLine !== 'string') return 0
  const nums = txnLine.match(/\d+/g)
  if (!nums?.length) return 0
  return Math.max(...nums.map((n) => parseInt(n, 10)))
}

const wineMatchesKeyword = (item, kwRaw) => matchesWineCatalogItem(item, kwRaw)

const matchesWinePriceTier = (price, tier) => {
  if (!tier) return true
  const p = Number(price)
  if (!Number.isFinite(p)) return false
  if (tier === 'lt200') return p < 200
  if (tier === '200400') return p >= 200 && p < 400
  if (tier === '400800') return p >= 400 && p < 800
  if (tier === 'gt800') return p >= 800
  return true
}

const matchesWineState = (regionNavName, stateFilter) => {
  if (!stateFilter) return true
  return String(regionNavName || '').trim() === String(stateFilter).trim()
}

const sortWineFacetSlice = (facets, sortByVal) => {
  const out = [...facets]
  switch (sortByVal) {
    case 'priceAsc':
      return out.sort((a, b) => a.price - b.price)
    case 'priceDesc':
      return out.sort((a, b) => b.price - a.price)
    case 'ratingDesc':
      return out.sort((a, b) => b.rating - a.rating)
    case 'salesDesc':
      return out.sort((a, b) => b.salesApprox - a.salesApprox)
    default:
      return out.sort((a, b) => a.idx - b.idx)
  }
}

const filteredWineFacetFullList = computed(() => {
  const kw = appliedWineSearchKeyword.value
  const stateFilter = wineFilterState.value
  const priceT = wineFilterPriceTier.value
  const sortVal = wineSortBy.value

  const facets = []
  dataList.value.forEach((entry, idx) => {
    const data = entry.data
    if (!wineMatchesKeyword(data, kw)) return
    if (!matchesWineState(entry.regionNavName, stateFilter)) return
    const wine = buildWineDisplay(data, { regionNavName: entry.regionNavName })
    const price = Number(wine.saleNum)
    const rating = Number(wine.ratingStars)
    const salesApprox = parseWineTxnSalesApprox(wine.transactionLine || '')
    if (!matchesWinePriceTier(price, priceT)) return
    facets.push({
      idx,
      entry,
      data,
      wine,
      price,
      rating,
      salesApprox
    })
  })
  return sortWineFacetSlice(facets, sortVal)
})

const filteredWineTotal = computed(() => filteredWineFacetFullList.value.length)

const hasActiveWineFilters = computed(() => {
  return (
    !!appliedWineSearchKeyword.value.trim() ||
    !!wineFilterState.value ||
    !!wineFilterPriceTier.value ||
    wineSortBy.value !== 'default'
  )
})

const syncAllWineRegionsData = async () => {
  const loadedRegions = await getAllWineRegions()
  allWineRegionsData.value = loadedRegions
}

const rowCartQty = reactive({})

const visibleWineFacetSlice = computed(() => {
  const cap = Math.max(0, renderLimit.value)
  return filteredWineFacetFullList.value.slice(0, cap)
})

const gridRows = computed(() =>
  visibleWineFacetSlice.value.map((facet) => ({
    entry: facet.entry,
    data: facet.data,
    idx: facet.idx,
    wine: facet.wine,
    priceParts: splitIntoGridPriceParts(facet.wine.saleNum, facet.wine.currencySymbol),
    listParts: splitIntoGridPriceParts(facet.wine.listNum, facet.wine.currencySymbol)
  }))
)

const resetWineGridFilters = () => {
  localWineSearchKeyword.value = ''
  appliedWineSearchKeyword.value = ''
  wineFilterState.value = ''
  wineFilterPriceTier.value = ''
  wineSortBy.value = 'default'
}

const executeWineSearch = async () => {
  const target = buildSearchResultsRoute(localWineSearchKeyword.value, SEARCH_SOURCE_WINE)
  if (!target) return
  await withRandomLoading(() => router.push(target), { min: 80, max: 300 })
}

const onWineSearchClear = () => {
  appliedWineSearchKeyword.value = ''
  resetRenderLimit()
  nextTick(() => {
    updateHasMore()
    initLoadMoreObserver()
    scheduleUpdateScrollPage()
  })
}

const resetWineGridFiltersAndView = () => {
  resetWineGridFilters()
  resetRenderLimit()
  nextTick(() => {
    updateHasMore()
    initLoadMoreObserver()
    scheduleUpdateScrollPage()
  })
}

const showGridCartMessage = (result, maxItems) => {
  if (result === 'success') {
    ElMessage({ type: 'success', message: '已加入购物车', showClose: true, offset: 24 })
  } else if (result === 'limit') {
    ElMessage({
      type: 'warning',
      message: `购物车数量已达上限（${maxItems || 500}）`,
      showClose: true,
      offset: 24
    })
  } else if (result === 'invalid') {
    ElMessage({
      type: 'error',
      message: '加入购物车失败：所选商品无效或缺少名称',
      showClose: true,
      offset: 24
    })
  } else {
    ElMessage({ type: 'error', message: '加入购物车失败，请稍后重试', showClose: true, offset: 24 })
  }
}

const handleGridAddCart = (row) => {
  const qty = rowCartQty[row.idx] ?? 1
  let resultHandled = false
  addToCart({
    item: row.data,
    regionPath: row.entry?.regionPath || '',
    regionName: row.entry?.regionNavName || '',
    subNavPath: row.entry?.subNavPath || currentSubNav.value?.subNavPath || '',
    subNavName: row.entry?.subNavName || currentSubNav.value?.subNavName || '',
    cartRegionNavName: row.entry?.regionNavName || '',
    quantity: qty,
    onResult: (result, extra = {}) => {
      resultHandled = true
      showGridCartMessage(result, extra.maxCartItems)
    }
  })
  setTimeout(() => {
    if (resultHandled) return
    showGridCartMessage('error')
  }, 320)
}

const gridRatingText = (row) => {
  const r = Number(row?.wine?.ratingStars)
  const safe = Number.isFinite(r) ? r : 0
  return safe.toFixed(1)
}

/** 电商风五角星刻度：full / half / empty */
const gridEcStarKinds = (row) => {
  const r = Math.min(5, Math.max(0, Number(row?.wine?.ratingStars) || 0))
  const kinds = []
  for (let i = 0; i < 5; i++) {
    const x = r - i
    if (x >= 0.76) kinds.push('full')
    else if (x >= 0.28) kinds.push('half')
    else kinds.push('empty')
  }
  return kinds
}

/** 大号「省 ¥…」文案用金额字符串 */
const gridSaveAmountText = (row) => {
  const a = row?.wine?.saveAmount
  if (!Number.isFinite(Number(a)) || Number(a) <= 1e-6) return ''
  const n = Math.round(Number(a) * 100) / 100
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2)
}

const buildHitKeyForEntry = (entry) => {
  if (!entry) return ''
  return buildCatalogHitKey('wine', entry.regionPath, entry.subNavPath, entry.data, entry.sourceItemIndex)
}

const buildHitKey = (listIdx) => buildHitKeyForEntry(dataList.value[listIdx])

const eachPageCount = computed(() => {
  if (isPhone.value) {
    return isPortrait.value ? 3 : 2
  }
  return 12
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredWineTotal.value / eachPageCount.value)))

function updateScrollPage() {
  if (!getGridEl()) return
  const totalShown = Math.min(renderLimit.value, filteredWineTotal.value)
  if (totalShown <= 0) {
    scrollPage.value = 1
    return
  }
  const per = eachPageCount.value || 1
  const pages = Math.max(1, Math.ceil(filteredWineTotal.value / per))
  const grid = getGridEl()
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

function checkHasMoreData() {
  loadMoad.value = (currentPage.value * eachPageCount.value) < dataList.value.length
}

const getImageLoading = (index) => (index < 8 ? 'eager' : 'lazy')
const getImageFetchPriority = (index) => (index < 8 ? 'high' : 'low')

const resetRenderLimit = () => {
  renderLimit.value = INITIAL_RENDER_COUNT
}

const updateHasMore = () => {
  hasMore.value = renderLimit.value < filteredWineTotal.value
}

const loadMoreItems = () => {
  if (!hasMore.value) return
  renderLimit.value = Math.min(filteredWineTotal.value, renderLimit.value + RENDER_STEP_COUNT)
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

const handleSubNavClick = (subItem) => {
  if (subNavDisabledMap.value[subItem]) return
  navStore.setActiveSubNav(subItem)
  if (typeof route.name === 'string' && isWineCatalogRoute(route.name)) {
    const targetSubNav = enabledSubNavs.value.find((subNav) => subNav.subNavName === subItem)
    if (!targetSubNav) return
    router.replace(buildWineGridRoute({ subNavPath: targetSubNav.subNavPath }))
  }
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
  navStore.saveScrollYThrottled(window.scrollY)
}

const openItemDialog = (item, idx = -1, entry = null) => {
  const nextItem = item ? { ...item } : null
  if (nextItem && Number.isInteger(idx) && idx >= 0) {
    // 保存命中 key，供购物车“回到原位置”能力复用
    nextItem.__hitKey = buildHitKey(idx)
  }
  selectedItemRegionNavName.value = entry?.regionNavName || ''
  dialogStore.closeDialog('wineryItemDetail')
  selectedItem.value = nextItem
  dialogStore.openDialog('wineItemDetail')
}

const addToCart = (payload) => {
  const onResult = payload?.onResult
  try {
    const item = payload?.item || payload
    const quantity = payload?.quantity || 1
    const hitKey = typeof item?.__hitKey === 'string' ? item.__hitKey : ''
    const hitRegionPath = hitKey.startsWith('wine__') ? (hitKey.split('__')[1] || '') : ''
    const hitSubNavPath = hitKey.startsWith('wine__') ? (hitKey.split('__')[2] || '') : ''
    const result = cartStore.addCartItem({
      item,
      regionPath: payload?.regionPath || hitRegionPath,
      regionName: payload?.regionName || selectedItemRegionNavName.value || '',
      subNavPath: payload?.subNavPath || hitSubNavPath || currentSubNav.value?.subNavPath || '',
      subNavName: payload?.subNavName || currentSubNav.value?.subNavName || '',
      quantity,
      cartRegionNavName: payload?.cartRegionNavName || payload?.regionName || selectedItemRegionNavName.value || ''
    })
    onResult?.(result, { maxCartItems: cartStore.MAX_CART_ITEMS })
  } catch (_) {
    onResult?.('error', { maxCartItems: cartStore.MAX_CART_ITEMS })
  }
}

const notifySearchHitDone = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auswine:search-hit-done'))
}

const isDialogBlockingScroll = () => {
  if (typeof document === 'undefined') return false
  return document.body.classList.contains('el-popup-parent--hidden')
}

const waitForSearchTargetReady = (hitKey, maxFrames = 180) => {
  return new Promise((resolve) => {
    let frame = 0
    const check = () => {
      const targetEl = getGridEl()?.querySelector?.(`[data-hit-key="${hitKey}"]`) || null
      const ready = targetEl && !isDialogBlockingScroll()
      if (ready || frame >= maxFrames) {
        resolve(targetEl)
        return
      }
      frame += 1
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

const focusCategoryPanelByHit = (hitKey, timeoutMs = 6000) => {
  return new Promise((resolve) => {
    const requestId = `focus_${Date.now()}_${Math.random().toString(36).slice(2)}`
    let timer = null

    const cleanup = () => {
      window.removeEventListener('auswine:focus-category-hit-result', onResult)
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    const onResult = (event) => {
      const detail = event?.detail || {}
      if (detail.requestId !== requestId) return
      cleanup()
      resolve(!!detail.handled)
    }

    window.addEventListener('auswine:focus-category-hit-result', onResult)
    window.dispatchEvent(new CustomEvent('auswine:focus-category-hit', {
      detail: { requestId, hitKey }
    }))

    timer = setTimeout(() => {
      cleanup()
      resolve(false)
    }, timeoutMs)
  })
}

const handleSearchTargetFocus = async () => {
  const routeHit = typeof route.query.hit === 'string' ? route.query.hit : ''
  const persisted = readSearchTarget()
  const canUsePersistedHit = !routeHit && persisted?.pending === true && typeof persisted?.hit === 'string'
  const rawTargetHit = routeHit || (canUsePersistedHit ? persisted.hit : '')
  const targetHit = rawTargetHit
    ? ((rawTargetHit.startsWith('item__') || rawTargetHit.startsWith('wine__')) ? rawTargetHit : `wine__${rawTargetHit}`)
    : ''
  if (!targetHit || handledSearchHit.value === targetHit) return

  const targetSourceType = targetHit.split('__')[0]
  if (targetSourceType === 'item') {
    await nextTick()
    const handledByPanel = await focusCategoryPanelByHit(targetHit)
    if (!handledByPanel) return

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
    return
  }

  const currentPrefix = `wine__`
  if (!targetHit.startsWith(currentPrefix)) return

  const targetSubNavPath = targetHit.split('__')[2] || ''
  if (targetSubNavPath && targetSubNavPath !== currentSubNav.value?.subNavPath) {
    const targetSubNav = enabledSubNavs.value.find((subNav) => subNav.subNavPath === targetSubNavPath)
    if (targetSubNav) {
      navStore.setActiveSubNav(targetSubNav.subNavName)
      if (typeof route.name === 'string' && isWineCatalogRoute(route.name)) {
        await router.replace({
          ...buildWineGridRoute({ subNavPath: targetSubNav.subNavPath }),
          query: { ...route.query }
        })
      }
      return
    }
  }

  resetWineGridFilters()

  const targetIndex = findCatalogEntryIndexByHitKey(dataList.value, targetHit, buildHitKeyForEntry)
  if (targetIndex < 0) return

  const targetVisibleCount = Math.max(
    INITIAL_RENDER_COUNT,
    (Math.floor(targetIndex / RENDER_STEP_COUNT) + 1) * RENDER_STEP_COUNT
  )
  renderLimit.value = Math.min(dataList.value.length, targetVisibleCount)
  updateHasMore()

  await nextTick()
  const targetEl = await waitForSearchTargetReady(targetHit)
  if (!targetEl) return

  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  void targetEl.offsetWidth
  await playSearchHitHighlight(targetEl)
  openItemDialog(dataList.value[targetIndex]?.data, targetIndex, dataList.value[targetIndex])
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

const gridItemThumbSrc = (row) => {
  if (!isTasmaniaGridEntry(row?.entry)) {
    return resolveItemGridImageUrl(row?.data)
  }
  return tasGridStyleTestThumbByIndex(row.entry?.sourceItemIndex ?? row.idx)
}

const applySubNavFromRoute = () => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  const firstSubNav = enabledSubNavs.value[0]?.subNavName || subNavList.value[0] || ''

  const routeSubNavPath = typeof route.params.subNav === 'string' ? route.params.subNav : ''
  const byRouteSubNav = routeSubNavPath
    ? enabledSubNavs.value.find((subNav) => subNav.subNavPath === routeSubNavPath)
    : null
  if (byRouteSubNav) {
    navStore.setActiveSubNav(byRouteSubNav.subNavName)
    return
  }

  if (routeName === 'Home') {
    navStore.setActiveSubNav(firstSubNav)
    return
  }

  const byStore = enabledSubNavs.value.find((subNav) => subNav.subNavName === activeSubNav.value)
  navStore.setActiveSubNav(byStore?.subNavName || firstSubNav)
}

onMounted(() => {
  deviceStore.startListen()
  applySubNavFromRoute()
  void syncAllWineRegionsData().then(() => {
    applySubNavFromRoute()
    resetRenderLimit()
    updateHasMore()
    nextTick(() => {
      initLoadMoreObserver()
      handleSearchTargetFocus()
    })
  })
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  requestAnimationFrame(() => {
    window.scrollTo({ top: navStore.scrollY, behavior: 'auto' })
    updateScrollPage()
  })
})

watch(() => route.name, () => {
  applySubNavFromRoute()
})

watch(() => route.params.subNav, () => {
  clearSearchHitState()
  applySubNavFromRoute()
  resetWineGridFilters()
  resetRenderLimit()
  updateHasMore()
  selectedItem.value = null
  selectedItemRegionNavName.value = ''
  nextTick(() => {
    initLoadMoreObserver()
  })
  handleSearchTargetFocus()
})

watch(() => route.query.hit, () => {
  if (typeof route.query.hit !== 'string' || !route.query.hit) return
  handledSearchHit.value = ''
  nextTick(() => {
    handleSearchTargetFocus()
  })
})

watch(() => dataList.value.length, () => {
  updateHasMore()
  clearSearchHitState()
  nextTick(() => {
    initLoadMoreObserver()
  })
  handleSearchTargetFocus()
})

watch(
  [wineFilterState, wineFilterPriceTier, wineSortBy],
  () => {
    resetRenderLimit()
    nextTick(() => {
      updateHasMore()
      initLoadMoreObserver()
      scheduleUpdateScrollPage()
    })
  }
)

watch(filteredWineTotal, () => {
  updateHasMore()
  nextTick(() => initLoadMoreObserver())
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
  navStore.flushScrollY()
})
</script>

<template>
  <CatalogGridShell
    ref="shellRef"
    variant="wine"
    :sub-nav-items="subNavList"
    :active-sub-nav="activeSubNav"
    :sub-nav-disabled-map="subNavDisabledMap"
    :show-grid="filteredWineTotal > 0"
    :has-more="hasMore"
    :show-pagination="filteredWineTotal > 0"
    :show-empty="dataList.length > 0"
    :scroll-page="scrollPage"
    :total-pages="totalPages"
    @sub-nav-select="handleSubNavClick"
  >
    <template #filter>
      <div class="wine-filter-toolbar wine-filter-toolbar--wine">
        <el-input v-model="localWineSearchKeyword" class="wine-filter-search" size="large" clearable
          placeholder="搜索酒款名称、产地、标签…" @keyup.enter="executeWineSearch" @clear="onWineSearchClear">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
          <template #append>
            <el-button type="primary" class="wine-filter-submit" @click="executeWineSearch">搜索</el-button>
          </template>
        </el-input>
        <el-select v-model="wineFilterState" class="wine-filter-select" size="large" clearable placeholder="州/领地">
          <el-option label="全部州/领地" value="" />
          <el-option v-for="opt in WINE_FILTER_STATE_OPTIONS" :key="'s-' + opt.value" :label="opt.label"
            :value="opt.value" />
        </el-select>
        <el-select v-model="wineFilterPriceTier" class="wine-filter-select" size="large" clearable placeholder="价格">
          <el-option v-for="opt in WINE_FILTER_PRICE_OPTIONS" :key="'p-' + String(opt.value)" :label="opt.label"
            :value="opt.value" />
        </el-select>
        <el-select v-model="wineSortBy" class="wine-filter-select wine-filter-select--sort" size="large"
          placeholder="排序">
          <el-option v-for="opt in WINE_SORT_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button size="large" class="wine-filter-reset" @click="resetWineGridFiltersAndView">重置</el-button>
      </div>
      <p class="wine-filter-hint">
        <span v-if="hasActiveWineFilters || appliedWineSearchKeyword">筛选结果 · </span>
        <span v-else>本栏共 </span>
        <strong>{{ filteredWineTotal }}</strong> 款酒
      </p>
    </template>

    <template #leading>
      <RegionNavMenuCard :nav-menu-items="navMenuItems" @select="openWineryPreviewInNewWindow" />
    </template>

    <template #items>
      <div v-for="row in gridRows"
        :key="`${row.entry?.regionPath || ''}-${row.entry?.subNavPath || ''}-${row.entry?.sourceItemIndex ?? row.idx}`"
        class="info-item pointer" @click="openItemDialog(row.data, row.idx, row.entry)" :data-title="row.data.title"
        :data-hit-key="buildHitKey(row.idx)">
        <div class="info-img-wrap" :class="['bgfff', {
          'info-img-wrap--tas-thumb-test': isTasmaniaGridEntry(row.entry)
        }]">
          <div class="info-img-top-bar">
            <div v-if="row.wine.promoBadges?.length" class="info-promo-row">
              <span v-for="(pb, pi) in row.wine.promoBadges" :key="pi" class="promo-chip"
                :class="`promo-chip--${String(pb.kind || 'muted').replace(/[^a-z0-9-]/gi, '')}`">{{ pb.text }}</span>
            </div>
            <span v-else class="info-img-top-bar-spacer" aria-hidden="true"></span>
          </div>
          <img :src="gridItemThumbSrc(row)" :alt="row.data.title" class="w100" :loading="getImageLoading(row.idx)"
            decoding="async" :fetchpriority="getImageFetchPriority(row.idx)">
        </div>
        <div class="info-title fs16" :title="row.data.title">{{ row.data.title }}</div>
        <div v-if="row.data.enTitle" class="info-sub info-sub--under-title" :title="row.data.enTitle">{{
          row.data.enTitle }}
        </div>
        <div class="info-ec-score-row" :title="'评分 ' + gridRatingText(row)" role="presentation">
          <span class="info-ec-score-num">{{ gridRatingText(row) }}</span>
          <span class="info-ec-star-strip" aria-hidden="true">
            <template v-for="(sk, sj) in gridEcStarKinds(row)" :key="sj">
              <span v-if="sk === 'full'" class="info-ec-star info-ec-star--full">★</span>
              <span v-else-if="sk === 'half'" class="info-ec-star info-ec-star--half-wrap"><span
                  class="info-ec-star-half">★</span></span>
              <span v-else class="info-ec-star info-ec-star--empty">☆</span>
            </template>
          </span>
          <span class="info-ec-drop" aria-hidden="true">⌵</span>
          <span v-if="row.wine.ratingReviewCount != null" class="info-ec-review-paren">({{ row.wine.ratingReviewCount
            }})</span>
        </div>
        <div class="info-meta-line info-meta-line--labeled">
          <span class="info-meta-piece">
            <span class="info-meta-tag">产地：</span><span class="info-meta-strong">{{ row.wine.origin }}</span>
          </span>
          <span class="info-meta-sep" aria-hidden="true">·</span>
          <span class="info-meta-piece">
            <span class="info-meta-tag">年份：</span><span class="info-meta-strong">{{ row.wine.vintage }}</span>
          </span>
        </div>

        <div class="grid-price-block grid-price-block--uniform">
            <div class="grid-price-main-row">
              <div class="info-price grid-sale-price"
                :class="row.wine.hasDiscount ? 'grid-sale-price--accent-only' : 'grid-sale-price--list-only'"
                :style="{ '--aw-price-color': GRID_PRICE_COLOR }">
                <span class="info-price-inner">
                  <span class="info-price-sym fowe7">{{ row.priceParts.currency }}</span>
                  <span class="info-price-main">
                    <span class="info-price-int">{{ row.priceParts.intPart }}</span>
                    <span v-if="row.priceParts.fraction" class="info-price-frac">.{{ row.priceParts.fraction }}</span>
                  </span>
                </span>
              </div>
              <span class="grid-price-unit">/ {{ row.wine.saleUnit }}</span>
              <span v-if="row.wine.hasDiscount" class="grid-ref-price-muted" aria-label="划线价" title="划线价">
                {{ row.listParts.currency }}{{ row.listParts.intPart }}
                <template v-if="row.listParts.fraction">.{{ row.listParts.fraction }}</template>
              </span>
            </div>
            <div class="grid-price-sub-row">
              <span v-if="row.wine.hasDiscount && gridSaveAmountText(row)" class="grid-save-badge">
                省 {{ row.priceParts.currency }}{{ gridSaveAmountText(row) }}
              </span>
              <span v-else class="grid-price-sub-placeholder" aria-hidden="true">占位</span>
            </div>
          </div>

        <div class="grid-cart-block">
          <span v-if="row.wine.transactionLine" class="grid-price-txn">{{ row.wine.transactionLine }}</span>
          <div class="grid-cart-stack" @click.stop>
          <div class="grid-cart-qty">
            <el-input-number :model-value="rowCartQty[row.idx] ?? 1" :min="1" :max="99"
              @update:model-value="(v) => { rowCartQty[row.idx] = v }" />
          </div>
          <el-button type="primary" class="grid-add-cart-btn" @click="handleGridAddCart(row)">加入购物车</el-button>
          </div>
        </div>
      </div>
    </template>

    <template #empty>
      <div class="wine-grid-empty">
        <p>暂无符合当前筛选的酒款。</p>
        <p class="wine-grid-empty-sub">请尝试重置条件，或调整价格 / 评分。</p>
        <el-button type="primary" class="wine-grid-empty-reset" @click="resetWineGridFiltersAndView">重置筛选</el-button>
      </div>
    </template>
  </CatalogGridShell>
  <ItemDataDialog v-if="itemDialogVisible" v-model:visible="itemDialogVisible" :title="selectedItem?.title || ''"
    :en-title="selectedItem?.enTitle || ''"
    :item-data="selectedItem ? [selectedItem] : []" :region-nav-name="selectedItemRegionNavName"
    @add-cart="addToCart" />
</template>
