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
import { getItemRegionByPath } from '@/utils/dataRepository'
import { resolveDataImage } from '@/utils/dataImageResolver'
import { buildWineryGridDisplay } from '@/utils/wineryGridExtras'
import {
  buildSearchResultsRoute,
  readSearchTarget,
  saveSearchTarget,
  SEARCH_SOURCE_ITEM
} from '@/utils/searchUtils'
import { withRandomLoading } from '@/utils/loadingUtils'

const INITIAL_RENDER_COUNT = 24
const RENDER_STEP_COUNT = 24

const SEARCH_SCOPE_OPTIONS = [
  { value: 'all', label: '全部字段' },
  { value: 'title', label: '标题' },
  { value: 'desc', label: '简介' },
  { value: 'tags', label: '标签' }
]

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
const resolvedImagePathCache = new Map()
const localSearchKeyword = ref('')
const appliedSearchKeyword = ref('')
const searchScope = ref('all')

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

const flattenText = (value) => {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) return value.map(flattenText).join(' ')
  if (typeof value === 'object') {
    return Object.values(value).map(flattenText).join(' ')
  }
  return ''
}

const matchesSearchKeyword = (item, kwRaw) => {
  const kw = String(kwRaw || '').trim().toLowerCase()
  if (!kw) return true
  const info = getItemInfo(item) || {}
  const scopeMap = {
    all: [
      item?.title,
      item?.enTitle,
      info?.name,
      info?.desc,
      info?.dialogInfoTitle,
      info?.dialogInfoDesc,
      info?.tags,
      info?.features,
      info?.source,
      item?.subNavName
    ],
    title: [item?.title, item?.enTitle],
    desc: [info?.desc, info?.dialogInfoDesc, info?.dialogInfoTitle],
    tags: [info?.tags, info?.features, info?.source]
  }
  const hay = flattenText(scopeMap[searchScope.value] || scopeMap.all).toLowerCase()
  return hay.includes(kw)
}

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

const buildHitKeyForEntry = (entry) =>
  `item__${entry?.regionPath || ''}__${entry?.subNavPath || ''}__${entry?.sourceItemIndex ?? ''}`

const dataList = computed(() => {
  const subNav = currentSubNav.value
  if (!subNav) return []
  return buildEntryListForSubNav(subNav)
    .filter((entry) => matchesSearchKeyword(entry.data, appliedSearchKeyword.value))
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

const resolveImageUrl = (img) => {
  const cacheKey = String(img || '')
  if (resolvedImagePathCache.has(cacheKey)) {
    return resolvedImagePathCache.get(cacheKey)
  }
  const resolved = resolveDataImage(img, undefined, { variant: 'thumb' })
  resolvedImagePathCache.set(cacheKey, resolved)
  return resolved
}

const openWineryPreviewInNewWindow = (menuItem) => {
  const regionPathValue = menuItem?.regionPath
  if (!regionPathValue) return
  const region = navData.find((item) => item?.path === regionPathValue)
  const firstSubNav = region?.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath || 'wine'
  const href = router.resolve({
    name: 'WineryPreview',
    params: {
      regionPath: regionPathValue,
      subNav: firstSubNav
    }
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

const goHome = () => {
  router.push({ name: 'Home' })
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
      params: { regionPath: hitRegionPath, subNav: hitSubNavPath || currentSubNav.value?.subNavPath || 'wine' },
      query: { ...route.query }
    })
    return
  }

  if (hitSubNavPath && hitSubNavPath !== currentSubNav.value?.subNavPath) {
    await router.replace({
      name: 'WineryPreview',
      params: { regionPath: regionPath.value, subNav: hitSubNavPath },
      query: { ...route.query }
    })
    return
  }

  localSearchKeyword.value = ''
  appliedSearchKeyword.value = ''

  const allEntries = buildEntryListForSubNav(currentSubNav.value)
  const targetIndex = allEntries.findIndex((entry) => buildHitKeyForEntry(entry) === targetHit)
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
  const byRoute = routeSubNavPath
    ? enabledSubNavs.value.find((subNav) => subNav.subNavPath === routeSubNavPath)
    : null
  const fallback = enabledSubNavs.value[0]
  if (!fallback) return
  if (!routeSubNavPath || !byRoute) {
    router.replace({
      name: 'WineryPreview',
      params: {
        regionPath: regionPath.value,
        subNav: fallback.subNavPath
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

const executeSearch = async () => {
  const target = buildSearchResultsRoute(localSearchKeyword.value, SEARCH_SOURCE_ITEM)
  if (!target) return
  await withRandomLoading(() => router.push(target), { min: 80, max: 300 })
}

const onSearchClear = () => {
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
  searchScope.value = 'all'
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
        <el-select v-model="searchScope" class="wine-filter-select" size="large" placeholder="筛选字段">
          <el-option v-for="opt in SEARCH_SCOPE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button size="large" class="wine-filter-reset" @click="resetSearchFiltersAndView">重置</el-button>
      </div>
      <p class="wine-filter-hint">
        <span v-if="appliedSearchKeyword">筛选结果 · </span>
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

    <template #leading>
      <!-- 【样式测试·可删】仅非 tasmania 州展示八州导航首格 -->
      <RegionNavMenuCard v-if="showLeadingNavMenu" :nav-menu-items="navMenuItems" :active-region-path="regionPath"
        @select="openWineryPreviewInNewWindow" />
    </template>

    <template #items>
      <div v-for="row in gridRows"
        :key="`${row.entry?.regionPath || ''}-${row.entry?.subNavPath || ''}-${row.entry?.sourceItemIndex ?? row.idx}`"
        class="info-item pointer" :data-title="row.data.title" :data-hit-key="buildHitKeyForEntry(row.entry)"
        @click="openWineryDetailInNewWindow(row.entry)">
        <div class="info-img-wrap bgfff">
          <img :src="resolveImageUrl(row.data.img)" :alt="row.data.title" class="w100"
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

    <template #empty>
      <div class="wine-grid-empty">
        <p>暂无符合当前筛选的酒庄。</p>
        <p class="wine-grid-empty-sub">请尝试重置条件，或修改搜索关键词。</p>
        <el-button type="primary" class="wine-grid-empty-reset" @click="resetSearchFiltersAndView">重置筛选</el-button>
      </div>
    </template>
  </CatalogGridShell>
</template>
