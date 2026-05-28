<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
const ItemDataDialog = defineAsyncComponent(() => import('@/components/dialogs/page/home/ItemDataDialog.vue'))
import { useDeviceStore } from '@/stores/deviceStore';
import { useNavStore } from '@/stores/navStore';
import { useCartStore } from '@/stores/cartStore'
import { useDialogStore } from '@/stores/dialogStore'
import navData from '@/data/split/nav.json';
import { readSearchTarget, saveSearchTarget } from '@/utils/searchUtils'
import { resolveDataImage } from '@/utils/dataImageResolver'
import { getWineRegionByPath } from '@/utils/dataRepository'
import { Z_INDEX } from '@/constants/zIndex'
import { buildWineDisplay } from '@/utils/wineGridExtras'
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
const regionRouteNames = navData.map((region) => region.path)
const fallbackRegionPath = navData[0]?.path || ''
const fallbackRegionNavName = navData[0]?.navName || '塔斯马尼亚州'
const INITIAL_RENDER_COUNT = 24
const RENDER_STEP_COUNT = 24

const gridRef = ref(null)
const loadMoreTriggerRef = ref(null)

const currentPage = ref(1)
const scrollPage = ref(1)
const loadMoad = ref(false)
const isLoading = ref(false)
const renderLimit = ref(INITIAL_RENDER_COUNT)
const hasMore = ref(false)
const deviceStore = useDeviceStore()
const { isPhone, isPortrait } = storeToRefs(deviceStore)
const navStore = useNavStore()
const { activeSubNav, activeNav } = storeToRefs(navStore)
const cartStore = useCartStore()
const dialogStore = useDialogStore()
const route = useRoute()
const router = useRouter()
const itemDialogVisible = computed({
  get: () => dialogStore.dialogs.wineItemDetail?.show === true,
  set: (v) =>
    v ? dialogStore.openDialog('wineItemDetail') : dialogStore.closeDialog('wineItemDetail')
})
const selectedItem = ref(null)
const resolvedImagePathCache = new Map()
const currentRegionData = ref(null)

const handledSearchHit = ref('')
let hitClearTimer = null
let loadMoreObserver = null
let scrollUpdateFrameId = 0

const clearSearchHitState = () => {
  if (hitClearTimer) {
    clearTimeout(hitClearTimer)
    hitClearTimer = null
  }
  const highlighted = gridRef.value?.querySelectorAll?.('.search-hit-active') || []
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

const currentRegionPath = computed(() => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  if (routeName && regionRouteNames.includes(routeName)) return routeName
  return fallbackRegionPath
})

const currentRegion = computed(() => {
  return currentRegionData.value
})

const allSubNavs = computed(() => currentRegion.value?.subNavList || [])
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

/** 【样式测试·可删】塔斯马尼亚任意子栏：列表缩略图用 tasGridStyleTestThumbByIndex；发布前与本 import、gridItemThumbSrc、--tas-thumb-test 样式一并删 */
const isTasmaniaGridStyleTestThumb = computed(() => currentRegionPath.value === 'tasmania')

/** 【样式测试·可删】仅塔斯马尼亚「白葡萄酒」：封面 2:3；发布前删本 computed 与 .info-img-wrap--tas-white-aspect-test */
const isTasmaniaWhiteWineGridStyleTest = computed(
  () =>
    currentRegionPath.value === 'tasmania' &&
    (currentSubNav.value?.subNavPath === 'white-wine' ||
      currentSubNav.value?.subNavName === '白葡萄酒')
)

const dataList = computed(() => currentSubNav.value?.itemData || [])

/** —— 酒款筛选 / 排序（参考 tto-demo TripsGrid 搜索 + 多条件下拉，样式独立）—— */
const localWineSearchKeyword = ref('')
const appliedWineSearchKeyword = ref('')
const wineFilterPriceTier = ref('')
const wineFilterRating = ref('')
const wineSortBy = ref('default')

const WINE_FILTER_PRICE_OPTIONS = [
  { value: '', label: '价格不限' },
  { value: 'lt200', label: '¥200 以下' },
  { value: '200400', label: '¥200 – ¥400' },
  { value: '400800', label: '¥400 – ¥800' },
  { value: 'gt800', label: '¥800 以上' }
]

const WINE_FILTER_RATING_OPTIONS = [
  { value: '', label: '评分不限' },
  { value: 'gte43', label: '★4.3 及以上' },
  { value: 'gte45', label: '★4.5 及以上' },
  { value: 'gte48', label: '★4.8 及以上' }
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

const wineMatchesKeyword = (item, kwRaw) => {
  const kw = String(kwRaw || '').trim().toLowerCase()
  if (!kw) return true
  const wd = item?.wineData && typeof item.wineData === 'object' ? item.wineData : {}
  const hay = [
    item?.title,
    item?.enTitle,
    wd.wineryName,
    wd.wineryLabel,
    wd.originRegion,
    wd.tasteProfile,
    wd.tastingNotes
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(kw)
}

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

const matchesWineRatingTier = (rating, opt) => {
  if (!opt) return true
  const r = Number(rating)
  if (!Number.isFinite(r)) return false
  if (opt === 'gte43') return r >= 4.3 - 1e-6
  if (opt === 'gte45') return r >= 4.5 - 1e-6
  if (opt === 'gte48') return r >= 4.8 - 1e-6
  return true
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
  const nav = currentRegion.value?.navName || ''
  const kw = appliedWineSearchKeyword.value
  const priceT = wineFilterPriceTier.value
  const ratingT = wineFilterRating.value
  const sortVal = wineSortBy.value

  const facets = []
  dataList.value.forEach((data, idx) => {
    if (!wineMatchesKeyword(data, kw)) return
    const wine = buildWineDisplay(data, { regionNavName: nav })
    const price = Number(wine.saleNum)
    const rating = Number(wine.ratingStars)
    const salesApprox = parseWineTxnSalesApprox(wine.transactionLine || '')
    if (!matchesWinePriceTier(price, priceT)) return
    if (!matchesWineRatingTier(rating, ratingT)) return
    facets.push({
      idx,
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
    !!wineFilterPriceTier.value ||
    !!wineFilterRating.value ||
    wineSortBy.value !== 'default'
  )
})

const syncCurrentRegionData = async () => {
  const regionPath = currentRegionPath.value
  const loadedRegion = await getWineRegionByPath(regionPath)
  if (regionPath !== currentRegionPath.value) return

  if (loadedRegion) {
    currentRegionData.value = loadedRegion
    return
  }

  const navRegion = navData.find((region) => region.path === regionPath) || navData[0] || null
  currentRegionData.value = navRegion
    ? {
      path: navRegion.path,
      navName: navRegion.navName,
      subNavList: Array.isArray(navRegion.subNavList) ? navRegion.subNavList : []
    }
    : null
}

const rowCartQty = reactive({})

const visibleWineFacetSlice = computed(() => {
  const cap = Math.max(0, renderLimit.value)
  return filteredWineFacetFullList.value.slice(0, cap)
})

const gridRows = computed(() =>
  visibleWineFacetSlice.value.map((facet) => ({
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
  wineFilterPriceTier.value = ''
  wineFilterRating.value = ''
  wineSortBy.value = 'default'
}

const executeWineSearch = () => {
  appliedWineSearchKeyword.value = localWineSearchKeyword.value.trim()
  resetRenderLimit()
  nextTick(() => {
    updateHasMore()
    initLoadMoreObserver()
    scheduleUpdateScrollPage()
  })
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

const buildHitKey = (itemIndex) => `wine__${currentRegionPath.value}__${currentSubNav.value?.subNavPath || ''}__${itemIndex}`

const eachPageCount = computed(() => {
  if (isPhone.value) {
    return isPortrait.value ? 3 : 2
  }
  return 12
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredWineTotal.value / eachPageCount.value)))

function updateScrollPage() {
  if (!gridRef.value) return
  const totalShown = Math.min(renderLimit.value, filteredWineTotal.value)
  if (totalShown <= 0) {
    scrollPage.value = 1
    return
  }
  const per = eachPageCount.value || 1
  const pages = Math.max(1, Math.ceil(filteredWineTotal.value / per))
  const grid = gridRef.value
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

const initLoadMoreObserver = () => {
  if (typeof window === 'undefined') return
  if (!('IntersectionObserver' in window)) return
  if (!loadMoreTriggerRef.value) return

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
  loadMoreObserver.observe(loadMoreTriggerRef.value)
}

const teardownLoadMoreObserver = () => {
  if (!loadMoreObserver) return
  loadMoreObserver.disconnect()
  loadMoreObserver = null
}

const handleSubNavClick = (subItem) => {
  if (subNavDisabledMap.value[subItem]) return
  navStore.setActiveSubNav(subItem)
  if (typeof route.name === 'string' && regionRouteNames.includes(route.name)) {
    const targetSubNav = enabledSubNavs.value.find((subNav) => subNav.subNavName === subItem)
    if (!targetSubNav) return
    router.replace({
      name: route.name,
      params: {
        ...route.params,
        subNav: targetSubNav.subNavPath
      }
    })
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

const openItemDialog = (item, idx = -1) => {
  const nextItem = item ? { ...item } : null
  if (nextItem && Number.isInteger(idx) && idx >= 0) {
    // 保存命中 key，供购物车“回到原位置”能力复用
    nextItem.__hitKey = buildHitKey(idx)
  }
  dialogStore.closeDialog('wineryItemDetail')
  selectedItem.value = nextItem
  dialogStore.openDialog('wineItemDetail')
}

const addToCart = (payload) => {
  const onResult = payload?.onResult
  try {
    const item = payload?.item || payload
    const quantity = payload?.quantity || 1
    const result = cartStore.addCartItem({
      item,
      regionPath: currentRegionPath.value,
      regionName: currentRegion.value?.navName || '',
      subNavPath: currentSubNav.value?.subNavPath || '',
      subNavName: currentSubNav.value?.subNavName || '',
      quantity,
      cartRegionNavName: currentRegion.value?.navName || ''
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
      const targetEl = gridRef.value?.querySelector?.(`[data-hit-key="${hitKey}"]`) || null
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

  const currentPrefix = `wine__${currentRegionPath.value}__${currentSubNav.value?.subNavPath || ''}__`
  if (!targetHit.startsWith(currentPrefix)) return

  resetWineGridFilters()

  const targetIndex = dataList.value.findIndex((_, idx) => buildHitKey(idx) === targetHit)
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
  openItemDialog(dataList.value[targetIndex])
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

const resolveImageUrl = (img) => {
  const cacheKey = String(img || '')
  if (resolvedImagePathCache.has(cacheKey)) {
    return resolvedImagePathCache.get(cacheKey)
  }
  const resolved = resolveDataImage(img, undefined, { variant: 'thumb' })
  resolvedImagePathCache.set(cacheKey, resolved)
  return resolved
}

/** 【样式测试·可删】塔斯马尼亚全栏轮换测试图；发布前与 isTasmaniaGridStyleTestThumb 一并移除 */
const gridItemThumbSrc = (row) => {
  if (!isTasmaniaGridStyleTestThumb.value) {
    return resolveImageUrl(row?.data?.img)
  }
  return tasGridStyleTestThumbByIndex(row.idx)
}

const applySubNavFromRoute = () => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  const firstSubNav = enabledSubNavs.value[0]?.subNavName || subNavList.value[0] || ''
  const targetRegion = currentRegion.value
  if (!targetRegion) return

  navStore.setActiveNav(targetRegion.navName || fallbackRegionNavName)

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
  resetRenderLimit()
  updateHasMore()
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  requestAnimationFrame(() => {
    window.scrollTo({ top: navStore.scrollY, behavior: 'auto' })
    updateScrollPage()
  })
  initLoadMoreObserver()
  handleSearchTargetFocus()
})

watch(() => currentRegionPath.value, () => {
  void syncCurrentRegionData()
}, { immediate: true })

watch(() => [route.name, route.params.subNav], () => {
  clearSearchHitState()
  applySubNavFromRoute()
  resetWineGridFilters()
  resetRenderLimit()
  updateHasMore()
  selectedItem.value = null
  nextTick(() => {
    initLoadMoreObserver()
  })
  handleSearchTargetFocus()
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
  [wineFilterPriceTier, wineFilterRating, wineSortBy],
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
  <div class="subnav-box center">
    <ul class="subnav-list">
      <li v-for="(subItem, idx) in subNavList" :key="idx" class="subnav-item w100"
        :class="{ active: activeSubNav === subItem, disabled: subNavDisabledMap[subItem] }"
        @click="handleSubNavClick(subItem)">
        {{ subItem }}
      </li>
    </ul>
  </div>

  <div class="wine-filter-bar-wrap center">
    <div class="wine-filter-bar">
      <div class="wine-filter-toolbar">
        <el-input v-model="localWineSearchKeyword" class="wine-filter-search" size="large" clearable
          placeholder="搜索酒庄、酒款、产地…" @keyup.enter="executeWineSearch" @clear="onWineSearchClear">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
          <template #append>
            <el-button type="primary" class="wine-filter-submit" @click="executeWineSearch">搜索</el-button>
          </template>
        </el-input>
        <el-select v-model="wineFilterPriceTier" class="wine-filter-select" size="large" clearable placeholder="价格">
          <el-option v-for="opt in WINE_FILTER_PRICE_OPTIONS" :key="'p-' + String(opt.value)" :label="opt.label"
            :value="opt.value" />
        </el-select>
        <el-select v-model="wineFilterRating" class="wine-filter-select" size="large" clearable placeholder="评分">
          <el-option v-for="opt in WINE_FILTER_RATING_OPTIONS" :key="'r-' + String(opt.value)" :label="opt.label"
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
    </div>
  </div>

  <template v-if="filteredWineTotal > 0">
    <div ref="gridRef" class="info-list">
      <div v-for="row in gridRows" :key="`${currentRegionPath}-${currentSubNav?.subNavPath || ''}-${row.idx}`"
        class="info-item pointer" @click="openItemDialog(row.data, row.idx)" :data-title="row.data.title"
        :data-hit-key="buildHitKey(row.idx)">
        <!-- 【样式测试·可删】塔斯全栏：测试图 + contain；仅白葡萄酒加 2:3；发布前删下列 class 与 gridItemThumbSrc -->
        <div class="info-img-wrap" :class="['bgfff', {
          'info-img-wrap--tas-thumb-test': isTasmaniaGridStyleTestThumb,
          'info-img-wrap--tas-white-aspect-test': isTasmaniaWhiteWineGridStyleTest
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

        <div class="grid-price-shell">
          <div class="grid-price-block">
            <template v-if="row.wine.hasDiscount">
              <div class="grid-price-discount-wrap">
                <div class="grid-price-inline-row">
                  <div class="info-price grid-sale-price grid-sale-price--accent-only"
                    :style="{ '--aw-price-color': GRID_PRICE_COLOR }">
                    <span class="info-price-inner">
                      <span class="info-price-sym fowe7">{{ row.priceParts.currency }}</span>
                      <span class="info-price-main">
                        <span class="info-price-int">{{ row.priceParts.intPart }}</span>
                        <span v-if="row.priceParts.fraction" class="info-price-frac">.{{ row.priceParts.fraction
                        }}</span>
                      </span>
                    </span>
                  </div>
                  <span class="grid-ref-price-muted" aria-label="划线价" title="划线价">
                    {{ row.listParts.currency }}{{ row.listParts.intPart }}
                    <template v-if="row.listParts.fraction">.{{ row.listParts.fraction }}</template>
                  </span>
                </div>
                <div v-if="gridSaveAmountText(row)" class="grid-save-strong">
                  省 {{ row.priceParts.currency }}{{ gridSaveAmountText(row) }}
                </div>
              </div>
            </template>
            <div v-else class="info-price grid-sale-price grid-sale-price--list-only"
              :style="{ '--aw-price-color': GRID_PRICE_COLOR }">
              <span class="info-price-inner">
                <span class="info-price-sym fowe7">{{ row.priceParts.currency }}</span>
                <span class="info-price-main">
                  <span class="info-price-int">{{ row.priceParts.intPart }}</span>
                  <span v-if="row.priceParts.fraction" class="info-price-frac">.{{ row.priceParts.fraction }}</span>
                </span>
              </span>
            </div>
          </div>
          <span v-if="row.wine.transactionLine" class="grid-price-txn">{{ row.wine.transactionLine }}</span>
        </div>

        <div class="grid-cart-stack" @click.stop>
          <div class="grid-cart-qty">
            <el-input-number :model-value="rowCartQty[row.idx] ?? 1" :min="1" :max="99"
              @update:model-value="(v) => { rowCartQty[row.idx] = v }" />
          </div>
          <el-button type="primary" class="grid-add-cart-btn" @click="handleGridAddCart(row)">加入购物车</el-button>
        </div>
      </div>
    </div>
    <div v-if="hasMore" ref="loadMoreTriggerRef" class="load-more-trigger" aria-hidden="true"></div>
  </template>
  <div v-else-if="dataList.length > 0" class="wine-grid-empty-wrap center">
    <div class="wine-grid-empty">
      <p>暂无符合当前筛选的酒款。</p>
      <p class="wine-grid-empty-sub">请尝试重置条件，或调整价格 / 评分。</p>
      <el-button type="primary" class="wine-grid-empty-reset" @click="resetWineGridFiltersAndView">重置筛选</el-button>
    </div>
  </div>

  <div v-if="filteredWineTotal > 0" class="pagination-section pagination-section--scenic center">
    <div class="custom-pagination custom-pagination--fixed">
      <div class="page-indicator fs16">第 <span class="page-num fowe7">{{ scrollPage }}</span> / {{
        totalPages }} 页</div>
    </div>
  </div>
  <ItemDataDialog v-if="itemDialogVisible" v-model:visible="itemDialogVisible" :title="selectedItem?.title || ''"
    :en-title="selectedItem?.enTitle || ''" :banner="resolveImageUrl(selectedItem?.img)"
    :item-data="selectedItem ? [selectedItem] : []" :region-nav-name="currentRegion?.navName || ''"
    @add-cart="addToCart" />
</template>

<style scoped lang="scss">
.subnav-box {
  width: 90%;
  padding: 0 20px;
  margin-top: 40px;

  .subnav-list {
    display: flex;
    justify-content: space-between;
    margin: 0;
    padding: 0;
    gap: 12px;

    .subnav-item {
      cursor: pointer;
      padding: 10px 16px;
      border-radius: 8px;
      background: linear-gradient(180deg, #ffffff 0%, #fce7ec 100%);
      color: #c92a52;
      // border: 1px solid #e5e7eb;
      transition: all .2s ease;
      white-space: nowrap;
      user-select: none;
    }

    .subnav-item.disabled {
      background: #f3f4f6;
      color: #9ca3af;
      border-color: #e5e7eb;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .subnav-item.active {
      background: linear-gradient(180deg, #c92a52 0%, #a8163c 100%);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 6px 16px rgba(168, 22, 60, 0.26);
    }
  }
}

/* PC端子导航字号（不影响平板和手机） */
@media (min-width: 1025px) {
  .subnav-box {
    .subnav-list {
      .subnav-item {
        font-size: var(--aw-font-16);
      }
    }
  }
}

/* 酒款筛选条：参考 tto 多条件栅格；配色贴近酒电商主色 */
.wine-filter-bar-wrap {
  width: 90%;
  padding: 0 20px;
  margin: 14px auto 6px;

  .wine-filter-bar {
    border-radius: 0;
    border: 1px solid rgba(168, 22, 60, 0.16);
    background: linear-gradient(145deg, #fffdfb 0%, #fff7f9 52%, #fff 100%);
    box-shadow:
      0 2px 8px rgba(168, 22, 60, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    padding: 14px 16px 12px;
    border-radius: 6px;
  }

  .wine-filter-toolbar {
    display: grid;
    grid-template-columns:
      minmax(220px, 1.3fr) repeat(2, minmax(128px, 0.62fr)) minmax(128px, 0.72fr) auto;
    gap: 10px 12px;
    align-items: center;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .wine-filter-search {
    min-width: 0;

    :deep(.el-input-group__wrapper) {
      border-radius: 0 !important;
    }

    :deep(.el-input__wrapper) {
      border-radius: 0;
    }

    :deep(.el-input-group__append) {
      padding: 0;
      background: transparent;
      border: none;
      box-shadow: none;

      .el-button.wine-filter-submit {
        margin: 0;
        border-radius: 0;
        padding: 0 18px;
        height: var(--el-component-size-large);
        background: linear-gradient(180deg, #c92a52 0%, #a8163c 100%);
        border: 1px solid #9a1538;
        color: #fff;
        font-weight: 600;
        letter-spacing: 1px;

        &:hover {
          filter: brightness(1.06);
          color: #fff;
        }
      }
    }
  }

  .wine-filter-select :deep(.el-select__wrapper) {
    border-radius: 0;
  }

  .wine-filter-reset {
    border-radius: 0;
    padding: 0 16px;
    color: #a8163c;
    border-color: rgba(168, 22, 60, 0.35);
    background: rgba(255, 255, 255, 0.65);

    &:hover {
      background: rgba(168, 22, 60, 0.06);
      color: #7f132e;
      border-color: rgba(168, 22, 60, 0.5);
    }
  }

  .wine-filter-hint {
    margin: 12px 0 0;
    font-size: 13px;
    color: #6b7280;

    strong {
      color: #a8163c;
      margin: 0 2px;
      font-weight: 700;
    }
  }
}

.wine-grid-empty-wrap {
  width: 90%;
  padding: 28px 20px 56px;

  .wine-grid-empty {
    padding: 32px 20px;
    text-align: center;
    border: 1px dashed rgba(168, 22, 60, 0.25);
    background: rgba(254, 242, 248, 0.45);
    color: #4b5563;

    p {
      margin: 0;
      font-size: 17px;
    }

    .wine-grid-empty-sub {
      margin-top: 8px !important;
      font-size: 14px;
      color: #6b7280;
    }

    .wine-grid-empty-reset {
      margin-top: 18px;
      border-radius: 0;
      padding: 0 22px;
      background: linear-gradient(180deg, #c92a52 0%, #a8163c 100%);
      border: none;
    }
  }
}

.info-list {
  display: grid;
  width: 90%;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 8px 0 40px;

  .info-item {
    display: flex;
    border-radius: 12px;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    border: 2px solid transparent;
    padding: 6px;
    transition:
      box-shadow 0.35s ease,
      border-color 0.35s ease,
      transform 0.35s ease,
      background-color 0.35s ease;

    img {
      object-fit: cover;
      display: block;
      width: 100%;
      height: 100%;
      transition: transform 0.45s cubic-bezier(0.33, 1, 0.68, 1);
      transform-origin: center center;
    }

    &:hover {
      border-color: rgba(168, 22, 60, 0.42);
      box-shadow: 0 14px 36px rgba(168, 22, 60, 0.16);
      transform: translateY(-4px);
      background: rgba(255, 252, 253, 0.98);

      .info-img-wrap img {
        transform: scale(1.07);
      }

      .info-title {
        color: #c92a52;
        text-decoration: underline solid rgba(201, 42, 82, 0.75);
        text-underline-offset: 5px;
        text-decoration-thickness: 1px;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }

      .info-sub,
      .info-sub--under-title {
        color: #991b36;
        text-decoration: underline solid rgba(153, 27, 54, 0.65);
        text-underline-offset: 4px;
        text-decoration-thickness: 1px;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }
    }

    .info-img-wrap {
      position: relative;
      width: 100%;
      border-radius: 10px;
      overflow: hidden;
    }

    /* 参考 300×400：宽:高 = 3:4 */
    .info-img-wrap:not(.info-img-wrap--tas-white-aspect-test) {
      aspect-ratio: 3 / 4;
    }

    /* 【样式测试·可删】塔斯马尼亚「白葡萄酒」：2:3 比例实验（勿让桌面 5:6 改写，故与 :not 拆分） */
    .info-img-wrap--tas-white-aspect-test {
      aspect-ratio: 2 / 3;
    }

    /* 【样式测试·可删】塔斯全栏测试缩略图：contain 完整显示，避免 cover 裁切显得「太大/不全」 */
    .info-img-wrap--tas-thumb-test {
      // background: #f3f0ec;

      img {
        object-fit: contain;
      }
    }

    .info-img-top-bar {
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      z-index: 2;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      pointer-events: none;
    }

    .info-img-top-bar-spacer {
      flex: 1;
      min-width: 0;
    }

    .info-promo-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      flex: 1;
      min-width: 0;
      align-items: flex-start;
      justify-content: flex-start;
    }

    .promo-chip {
      font-size: 11px;
      padding: 3px 7px;
      border-radius: 4px;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: 0;
      backdrop-filter: blur(10px);

      &.promo-chip--hot {
        color: rgba(127, 29, 29, 0.95);
        background: rgba(254, 226, 226, 0.55);
        border: 1px solid rgba(252, 165, 165, 0.45);
      }

      &.promo-chip--sales {
        color: rgba(124, 45, 18, 0.95);
        background: rgba(254, 215, 170, 0.45);
        border: 1px solid rgba(253, 186, 116, 0.4);
      }

      &.promo-chip--week {
        color: rgba(91, 33, 182, 0.95);
        background: rgba(237, 233, 254, 0.5);
        border: 1px solid rgba(196, 181, 253, 0.45);
      }

      &.promo-chip--muted {
        color: rgba(55, 65, 81, 0.94);
        background: rgba(243, 244, 246, 0.5);
        border: 1px solid rgba(229, 231, 235, 0.7);
      }
    }

    .info-meta-line.info-meta-line--labeled {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 8px;
      margin-top: 2px;

      .info-meta-piece {
        display: inline-flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 2px 4px;
      }

      .info-meta-tag {
        font-size: 12px;
        font-weight: 700;
        color: #111827;
        letter-spacing: 0.5px;
        flex-shrink: 0;
      }

      .info-meta-strong {
        font-size: clamp(13px, 3vw, 15px);
        font-weight: 800;
        color: #9d174d;
        letter-spacing: 0.03em;
        line-height: 1.35;
        word-break: break-word;
      }

      .info-meta-sep {
        color: #d1d5db;
        font-weight: 500;
      }
    }

    .grid-price-shell {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 4px;
      width: 100%;
      min-width: 0;
    }

    .grid-price-txn {
      flex-shrink: 0;
      max-width: 48%;
      font-size: clamp(11px, 2.85vw, 13px);
      font-weight: 500;
      line-height: 1.35;
      color: #878787;
      letter-spacing: 0;
      text-align: right;
      pointer-events: none;
    }

    .info-ec-score-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px 6px;
      margin-top: 4px;
      line-height: 1.35;
      pointer-events: none;
    }

    .info-ec-score-num {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      font-variant-numeric: tabular-nums;
    }

    .info-ec-star-strip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 14px;
      line-height: 1;
      transform: translateY(-0.5px);
    }

    .info-ec-star {
      flex-shrink: 0;
      line-height: 1;
    }

    .info-ec-star--full {
      color: #f97316;
    }

    .info-ec-star--empty {
      color: #cfd4dc;
      font-size: 13px;
    }

    .info-ec-star--half-wrap {
      display: inline-flex;
      width: 0.62em;
      overflow: hidden;
      justify-content: flex-start;

      .info-ec-star-half {
        color: #f97316;
        line-height: 1;
      }
    }

    .info-ec-drop {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      align-self: center;
      font-size: 10px;
      font-weight: 600;
      color: #4b5563;
      line-height: 1;
      margin-right: -2px;
      /* ⌵ 字形的 visual center 略高于数字基线，微上移与星号行对齐 */
      transform: translateY(-0.5px);
    }

    .info-ec-review-paren {
      font-size: 13px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      color: #2563eb;
    }

    .grid-price-block {
      flex: 1;
      min-width: 0;
      margin-top: 0;
    }

    .grid-price-discount-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .grid-price-inline-row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 10px 12px;
    }

    .grid-ref-price-muted {
      font-size: clamp(13px, 2.85vw, 15px);
      font-weight: 500;
      color: #9ca3af;
      text-decoration: line-through;
      letter-spacing: 0;
      font-variant-numeric: tabular-nums;
      opacity: 0.92;
    }

    .grid-save-strong {
      font-size: clamp(14px, 3.4vw, 17px);
      font-weight: 800;
      color: #c2410c;
      letter-spacing: 0.5px;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
    }

    .grid-cart-stack {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      margin-top: 10px;

      .grid-cart-qty {
        width: 100%;

        :deep(.el-input-number) {
          width: 100%;
          vertical-align: middle;

          .el-input-number__decrease,
          .el-input-number__increase {
            width: 40px;
            font-size: 16px;
          }

          .el-input__wrapper {
            width: 100%;
            min-height: 42px;
            padding-top: 6px;
            padding-bottom: 6px;
            border-radius: 8px;
            align-items: center;
          }

          .el-input__inner {
            min-height: 28px;
            line-height: 28px;
            font-size: 15px;
            font-weight: 600;
          }
        }
      }

      .grid-add-cart-btn {
        width: 100%;
        min-height: 44px;
        padding: 10px 18px;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 1px;
        border-radius: 10px;
      }
    }

    .info-price.grid-sale-price {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px;

      &.grid-sale-price--list-only {
        margin-top: 2px;
      }

      &.grid-sale-price--accent-only {
        margin-top: 0;
        letter-spacing: 0;

        .info-price-sym {
          font-size: clamp(14px, 3.15vw, 17px);
        }

        .info-price-int {
          font-size: clamp(23px, 5.35vw, 30px);
        }

        .info-price-frac {
          font-size: clamp(13px, 3.05vw, 16px);
        }
      }
    }

    .info-title {
      font-weight: 600;
      letter-spacing: 2px;
      color: #1f2937;
      -webkit-line-clamp: 1;
      line-clamp: 1;
      text-decoration: none;
      transition: color 0.28s ease;
    }

    /* 标题下价格：大号数字 + 较小货币与小数（无背景边框阴影） */
    .info-price {
      color: var(--aw-price-color, #a8163c);
      letter-spacing: 0;
      line-height: 1.05;
      margin-top: 2px;

      .info-price-inner {
        display: inline-flex;
        align-items: baseline;
        flex-wrap: nowrap;
      }

      .info-price-sym {
        flex-shrink: 0;
        font-size: clamp(13px, 2.9vw, 15px);
        margin-right: 5px;
        line-height: 1;
      }

      .info-price-main {
        display: inline-flex;
        align-items: baseline;
        flex-wrap: nowrap;
        font-weight: 800;
      }

      .info-price-int {
        font-size: clamp(21px, 4.8vw, 26px);
        line-height: 1;
      }

      .info-price-frac {
        flex-shrink: 0;
        font-size: clamp(12px, 2.9vw, 14px);
        font-weight: 700;
        line-height: 1;
        vertical-align: top;
        margin-left: 0.03em;
        transform: translateY(-0.2em);
      }
    }

    .info-sub {
      font-size: 12px;
      color: #6b7280;
      letter-spacing: 2px;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      line-height: 1.5;
      min-height: calc(1.5em * 2);
      text-decoration: none;
      transition: color 0.28s ease;
    }

    .info-sub--under-title {
      margin-top: 2px;
      min-height: unset;
      letter-spacing: 1px;
      font-weight: 500;
      color: #757575;
    }

    .info-title,
    .info-sub {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .info-item.search-hit-active {
    border-color: #c92a52;
    box-shadow: 0 0 0 3px rgba(201, 42, 82, 0.22), 0 10px 26px rgba(201, 42, 82, 0.24);
    animation: hitPulse 1.6s ease;
    transform: translateY(-2px);
  }
}

.pagination-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 40px;

  .custom-pagination {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;

    .page-indicator {
      color: #6b7280;
      letter-spacing: 1px;
      line-height: 1.5;

      .page-num {
        font-size: 20px;
        color: #a8163c;
        line-height: 24px;
      }
    }
  }

  .custom-pagination--fixed {
    position: fixed;
    bottom: 60px;
    left: calc(50% + (100vw - 100%) / 2);
    transform: translateX(-50%);
    z-index: v-bind('Z_INDEX.page.floatingPagination');
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
}

.load-more-trigger {
  width: 100%;
  height: 1px;
}

:deep(.el-pagination) {
  .el-pager li {
    &.is-active {
      background-color: #a8163c;
      color: white;
    }

    &:hover {
      color: #a8163c;
    }
  }

  .btn-prev,
  .btn-next {
    &:hover {
      color: #a8163c;
    }
  }
}

@keyframes hitPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(201, 42, 82, 0.45), 0 8px 18px rgba(201, 42, 82, 0.16);
  }

  60% {
    box-shadow: 0 0 0 10px rgba(201, 42, 82, 0.08), 0 14px 30px rgba(201, 42, 82, 0.24);
  }

  100% {
    box-shadow: 0 0 0 3px rgba(201, 42, 82, 0.22), 0 10px 26px rgba(201, 42, 82, 0.24);
  }
}

@media (min-width: 1025px) {
  .subnav-box {
    width: min(86%, 1400px);
    margin-top: 30px;
  }

  .wine-filter-bar-wrap {
    width: min(86%, 1400px);
    margin: 12px auto 4px;

    .wine-filter-bar {
      padding: 12px 14px 10px;
    }
  }

  .wine-grid-empty-wrap {
    width: min(86%, 1400px);
    padding: 22px 18px 48px;
  }

  .info-list {
    width: min(86%, 1400px);
    gap: 12px;
    padding: 6px 0 34px;

    .info-item {
      border-radius: 10px;
      gap: 4px;
      padding: 5px;

      .info-img-wrap {
        border-radius: 9px;
      }

      .info-img-wrap:not(.info-img-wrap--tas-white-aspect-test) {
        aspect-ratio: 2 / 3;
      }

      .info-img-top-bar {
        top: 7px;
        left: 7px;
        right: 7px;
      }

      .info-promo-row {
        gap: 5px;
      }

      .promo-chip {
        font-size: 10px;
        padding: 2px 6px;
      }

      .info-meta-line.info-meta-line--labeled {
        .info-meta-tag {
          font-size: 11px;
        }

        .info-meta-strong {
          font-size: clamp(12px, 2.8vw, 14px);
        }
      }

      .grid-price-shell {
        gap: 8px;
        margin-top: 2px;
      }

      .grid-price-txn {
        font-size: clamp(10px, 2.6vw, 12px);
      }

      .info-ec-score-row {
        gap: 3px 5px;
        margin-top: 3px;
      }

      .info-ec-score-num {
        font-size: 13px;
      }

      .info-ec-star-strip {
        font-size: 13px;
      }

      .info-ec-drop {
        font-size: 9px;
      }

      .info-ec-review-paren {
        font-size: 12px;
      }

      .grid-price-discount-wrap {
        gap: 6px;
      }

      .grid-price-inline-row {
        gap: 8px 10px;
      }

      .grid-ref-price-muted {
        font-size: clamp(12px, 2.65vw, 14px);
      }

      .grid-save-strong {
        font-size: clamp(13px, 3.1vw, 15px);
      }

      .grid-cart-stack {
        gap: 8px;
        margin-top: 8px;

        .grid-cart-qty {
          :deep(.el-input-number) {
            .el-input-number__decrease,
            .el-input-number__increase {
              width: 36px;
              font-size: 15px;
            }

            .el-input__wrapper {
              min-height: 38px;
              padding-top: 4px;
              padding-bottom: 4px;
              border-radius: 7px;
            }

            .el-input__inner {
              min-height: 24px;
              line-height: 24px;
              font-size: 14px;
            }
          }
        }

        .grid-add-cart-btn {
          min-height: 40px;
          padding: 8px 16px;
          font-size: 14px;
          letter-spacing: 0.5px;
          border-radius: 8px;
        }
      }

      .info-price.grid-sale-price {
        &.grid-sale-price--accent-only {
          .info-price-sym {
            font-size: clamp(13px, 2.95vw, 16px);
          }

          .info-price-int {
            font-size: clamp(20px, 4.5vw, 26px);
          }

          .info-price-frac {
            font-size: clamp(11px, 2.8vw, 14px);
          }
        }
      }

      .info-title {
        font-size: 15px;
        letter-spacing: 1px;
      }

      .info-price {
        .info-price-sym {
          font-size: clamp(12px, 2.7vw, 14px);
        }

        .info-price-int {
          font-size: clamp(19px, 4.2vw, 24px);
        }

        .info-price-frac {
          font-size: clamp(11px, 2.6vw, 13px);
        }
      }

      .info-sub {
        font-size: 11px;
        letter-spacing: 1px;
      }

      .info-sub--under-title {
        letter-spacing: 0.5px;
      }
    }
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .subnav-box {
    .subnav-list {
      width: 95%;
      flex: 10px;
    }
  }

  .info-list {
    grid-template-columns: repeat(4, 1fr)
  }
}

@media (max-width: 768px) {
  .subnav-box {
    flex-direction: column;
    padding: 0;

    .subnav-list {
      display: grid;
      width: 100%;
      gap: 10px;
      grid-template-columns: repeat(1, 1fr);
      // margin-top: 10px;
    }
  }
}

// 移动端竖屏
@media (max-width: 768px) and (orientation: portrait) {
  .info-list {
    grid-template-columns: repeat(1, 1fr);
    gap: 20px;

    .info-item {
      gap: 10px;
    }
  }
}

// 移动端横屏
@media (max-width: 768px) and (orientation: landscape) {
  .info-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

    .info-item {
      gap: 8px;
    }
  }
}


/* 超小屏幕设备适配（iPhone 4、iPhone 5、iPhone SE等，<=375px） */
@media (max-width: 375px) {
  .subnav-box {
    .subnav-list {
      gap: 0
    }
  }
}
</style>
