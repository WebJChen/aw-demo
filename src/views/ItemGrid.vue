<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { ItemDataDialog } from '@/components/dialogs/page/home';
import { useDeviceStore } from '@/stores/deviceStore';
import { useNavStore } from '@/stores/navStore';
import defaultImg from '@/assets/img/default.png';
import itemJson from '@/data/item.json';
import { readSearchTarget, saveSearchTarget } from '@/utils/searchUtils'
import CategoryDetailPanel from '@/views/CategoryDetailPanel.vue'

const regionRouteNames = itemJson.map((region) => region.path)

const gridRef = ref(null)

const currentPage = ref(1)
const scrollPage = ref(1)
const loadMoad = ref(false)
const isLoading = ref(false)
const deviceStore = useDeviceStore()
const { isPhone, isPortrait } = storeToRefs(deviceStore)
const navStore = useNavStore()
const { activeSubNav, activeNav } = storeToRefs(navStore)
const route = useRoute()
const router = useRouter()
const itemDialogVisible = ref(false)
const selectedItem = ref(null)

const handledSearchHit = ref('')
let hitClearTimer = null

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
  return itemJson[0]?.path || ''
})

const currentRegion = computed(() => {
  return itemJson.find((region) => region.path === currentRegionPath.value) || itemJson[0] || null
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

const dataList = computed(() => currentSubNav.value?.itemData || [])
const buildHitKey = (itemIndex) => `${currentRegionPath.value}__${currentSubNav.value?.subNavPath || ''}__${itemIndex}`

const eachPageCount = computed(() => {
  if (isPhone.value) {
    return isPortrait.value ? 3 : 2
  }
  return 12
})

const totalPages = computed(() => Math.max(1, Math.ceil(dataList.value.length / eachPageCount.value)))

function updateScrollPage() {
  if (!gridRef.value) return
  const total = dataList.value.length
  if (total <= 0) {
    scrollPage.value = 1
    return
  }
  const per = eachPageCount.value || 1
  const pages = Math.max(1, Math.ceil(total / per))
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
  const pageHeight = (totalHeight / total) * per
  const page = Math.ceil(scrollOffset / pageHeight) + 1
  scrollPage.value = Math.min(pages, Math.max(1, page))
}

function checkHasMoreData() {
  loadMoad.value = (currentPage.value * eachPageCount.value) < dataList.value.length
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

const handleWindowScroll = () => {
  updateScrollPage()
  navStore.saveScrollYThrottled(window.scrollY)
}

const openItemDialog = (item) => {
  selectedItem.value = item || null
  itemDialogVisible.value = true
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

const handleSearchTargetFocus = async () => {
  const routeHit = typeof route.query.hit === 'string' ? route.query.hit : ''
  const persisted = readSearchTarget()
  const canUsePersistedHit = !routeHit && persisted?.pending === true && typeof persisted?.hit === 'string'
  const targetHit = routeHit || (canUsePersistedHit ? persisted.hit : '')
  if (!targetHit || handledSearchHit.value === targetHit) return

  const currentPrefix = `${currentRegionPath.value}__${currentSubNav.value?.subNavPath || ''}__`
  if (!targetHit.startsWith(currentPrefix)) return

  const targetIndex = dataList.value.findIndex((_, idx) => buildHitKey(idx) === targetHit)
  if (targetIndex < 0) return

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
  const raw = typeof img === 'string' ? img.trim() : ''
  if (!raw) return defaultImg
  if (/^(https?:|data:|blob:)/.test(raw)) return raw
  if (raw.startsWith('/')) return raw

  const candidates = [raw]
  if (raw.startsWith('@/')) {
    candidates.push(`../${raw.slice(2)}`)
  }

  for (const candidate of candidates) {
    try {
      return new URL(candidate, import.meta.url).href
    } catch (_) { }
  }
  return defaultImg
}

const applySubNavFromRoute = () => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  const firstSubNav = enabledSubNavs.value[0]?.subNavName || subNavList.value[0] || ''
  const targetRegion = currentRegion.value
  if (!targetRegion) return

  navStore.setActiveNav(targetRegion.navName || itemJson[0]?.navName || '塔斯马尼亚州')

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
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  requestAnimationFrame(() => {
    window.scrollTo({ top: navStore.scrollY, behavior: 'auto' })
    updateScrollPage()
  })
  handleSearchTargetFocus()
})

watch(() => [route.name, route.params.subNav], () => {
  clearSearchHitState()
  applySubNavFromRoute()
  selectedItem.value = null
  handleSearchTargetFocus()
})

watch(() => dataList.value.length, () => {
  clearSearchHitState()
  handleSearchTargetFocus()
})

onUnmounted(() => {
  clearSearchHitState()
  deviceStore.stopListen()
  window.removeEventListener('scroll', handleWindowScroll)
  navStore.flushScrollY()
})
</script>

<template>
  <CategoryDetailPanel />
  <div class="subnav-box center">
    <ul class="subnav-list">
      <li v-for="(subItem, idx) in subNavList" :key="idx" class="subnav-item w100"
        :class="{ active: activeSubNav === subItem, disabled: subNavDisabledMap[subItem] }"
        @click="handleSubNavClick(subItem)">
        {{ subItem }}
      </li>
    </ul>
  </div>

  <div ref="gridRef" class="info-list">
    <div v-for="(data, idx) in dataList" :key="idx" class="info-item pointer" @click="openItemDialog(data)"
      :data-title="data.title" :data-hit-key="buildHitKey(idx)">
      <img :src="resolveImageUrl(data.img)" :alt="data.title" class="w100">
      <div class="info-title fs16" :title="data.title">{{ data.title }}</div>
      <div v-if="data.enTitle" class="info-sub" :title="data.enTitle">{{ data.enTitle }}</div>
    </div>
  </div>

  <div class="pagination-section pagination-section--scenic center">
    <div class="custom-pagination custom-pagination--fixed">
      <div class="page-indicator fs16">第 <span class="page-num fowe7">{{ scrollPage }}</span> / {{
        totalPages }} 页</div>
    </div>
  </div>
  <ItemDataDialog v-model:visible="itemDialogVisible" :title="selectedItem?.title || ''"
    :en-title="selectedItem?.enTitle || ''" :banner="resolveImageUrl(selectedItem?.img)"
    :item-data="selectedItem ? [selectedItem] : []" />
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
      background: #fff;
      color: #33b1a3;
      border: 1px solid #e5e7eb;
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
      background: linear-gradient(180deg, #33b1a3 0%, #279486 100%);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 6px 16px rgba(61, 199, 190, 0.26);
    }
  }
}

.info-list {
  display: grid;
  width: 90%;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 8px 0 40px;

  img {
    height: 240px;
  }

  .info-item {
    display: flex;
    border-radius: 12px;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    border: 2px solid transparent;
    transition: box-shadow .35s ease, border-color .35s ease, transform .35s ease;

    img {
      object-fit: cover;
    }

    .info-title {
      font-weight: 600;
      letter-spacing: 2px;
      color: #1f2937;
      -webkit-line-clamp: 1;
      line-clamp: 1;
    }

    .info-sub {
      font-size: 12px;
      color: #6b7280;
      letter-spacing: 2px;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      line-height: 1.5;
      min-height: calc(1.5em * 2);
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
    border-color: #33b1a3;
    box-shadow: 0 0 0 3px rgba(51, 177, 163, 0.22), 0 10px 26px rgba(51, 177, 163, 0.24);
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
        color: #279486;
        line-height: 24px;
      }
    }
  }

  .custom-pagination--fixed {
    position: fixed;
    bottom: 60px;
    left: calc(50% + (100vw - 100%) / 2);
    transform: translateX(-50%);
    z-index: 1000;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
}

:deep(.el-pagination) {
  .el-pager li {
    &.is-active {
      background-color: #279486;
      color: white;
    }

    &:hover {
      color: #279486;
    }
  }

  .btn-prev,
  .btn-next {
    &:hover {
      color: #279486;
    }
  }
}

@keyframes hitPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(51, 177, 163, 0.45), 0 8px 18px rgba(51, 177, 163, 0.16);
  }

  60% {
    box-shadow: 0 0 0 10px rgba(51, 177, 163, 0.08), 0 14px 30px rgba(51, 177, 163, 0.24);
  }

  100% {
    box-shadow: 0 0 0 3px rgba(51, 177, 163, 0.22), 0 10px 26px rgba(51, 177, 163, 0.24);
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
      margin-top: 10px;
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

    img {
      height: 180px;
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
