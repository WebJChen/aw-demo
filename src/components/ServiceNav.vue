<script setup>
import { Search } from '@element-plus/icons-vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNavStore } from '@/stores/navStore'
import navData from '@/data/split/nav.json'
import { withRandomLoading } from '@/utils/loadingUtils'
import CategoryDetailPanel from '@/views/CategoryDetailPanel.vue'
import { Z_INDEX } from '@/constants/zIndex'

const route = useRoute()
const router = useRouter()
const navStore = useNavStore()
const { activeNav } = storeToRefs(navStore)
const keyword = ref('')
const categoryPanelRef = ref(null)

const syncKeywordFromRoute = () => {
  keyword.value = typeof route.query.s === 'string' ? route.query.s : ''
}

const navItems = computed(() => navData.map((item) => ({
  tag: item.navName,
  slug: item.path,
  available: item.available !== false,
  capital: item.capital,
  // 大导航点击后默认进入该地区第一个可用子导航，避免 URL 停留在仅地区层级
  firstSubNavPath: item.subNavList?.find((subNav) => subNav?.isShow !== false)?.subNavPath
})))

const slugTagMap = computed(() => Object.fromEntries(navItems.value.map((item) => [item.slug, item.tag])))

const tagRoutes = computed(() => navItems.value.map((item) => ({
  ...item,
  href: router.resolve({
    name: item.slug,
    params: { subNav: item.firstSubNavPath }
  }).href
})))
const isSearchRoute = computed(() => route.name === 'SearchResults')
const isCartRoute = computed(() => route.name === 'Cart')
const isOrderNeutralRoute = computed(() => route.name === 'OrderList' || route.name === 'OrderDetail')

const handleTagClick = (item, event) => {
  // 禁用项仅展示样式，不允许新开页面
  if (!item.available) {
    event.preventDefault()
  }
}

const openSearchPage = async () => {
  const s = keyword.value.trim()
  if (!s) return
  await withRandomLoading(() => router.push({
    name: 'SearchResults',
    query: { s }
  }), {
    min: 80,
    max: 300
  })
}

const onSearchEnter = () => {
  openSearchPage()
}

const handleFocusCategoryHit = async (event) => {
  const detail = event?.detail || {}
  const requestId = detail.requestId
  const hitKey = detail.hitKey
  const handled = await categoryPanelRef.value?.focusByHit?.(hitKey)
  window.dispatchEvent(new CustomEvent('auswine:focus-category-hit-result', {
    detail: {
      requestId,
      handled: !!handled
    }
  }))
}

onMounted(() => {
  window.addEventListener('auswine:focus-category-hit', handleFocusCategoryHit)
})

onUnmounted(() => {
  window.removeEventListener('auswine:focus-category-hit', handleFocusCategoryHit)
})

watch(() => route.name, (name) => {
  if (name === 'OrderList' || name === 'OrderDetail') return
  if (typeof name === 'string' && slugTagMap.value[name]) {
    navStore.setActiveNav(slugTagMap.value[name])
    return
  }
  if (name === 'Home') navStore.setActiveNav(navItems.value[0]?.tag || '塔斯马尼亚州')
}, { immediate: true })

watch(() => route.query.s, () => {
  syncKeywordFromRoute()
}, { immediate: true })

/*
 * 八大州导航 + 全站搜索框 UI 已暂时隐藏（见 template 注释块）。
 * 下列逻辑仍保留，供路由同步、搜索跳转、分类面板定位等功能继续使用，请勿删除。
 * - navItems / tagRoutes / handleTagClick
 * - keyword / openSearchPage / onSearchEnter / syncKeywordFromRoute
 * - watch(route.name) 同步 activeNav
 * - handleFocusCategoryHit / CategoryDetailPanel
 */
</script>

<template>
  <!-- 【UI 暂隐·功能保留】原 search-nav 卡片整块隐藏；CategoryDetailPanel 仍挂载供 focusByHit 使用 -->
  <!--
  <div class="search-nav">
    <el-card class="search-card" shadow="hover">
      <div class="search-tags">...</div>
      <div class="search-container">...</div>
    </el-card>
  </div>
  -->
  <CategoryDetailPanel v-if="!isSearchRoute && !isCartRoute && !isOrderNeutralRoute" ref="categoryPanelRef"
    class="service-nav-panel-host--hidden" />
</template>

<style scoped lang="scss">
.service-nav-panel-host--hidden {
  display: none;
}

.search-nav {
  display: flex;
  justify-content: center;
  position: relative;
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
  z-index: v-bind('Z_INDEX.page.searchNav');
  padding: 0 20px;
  margin-bottom: 40px;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .search-card {
    border-radius: 12px;
    border: none;

    .search-tags {
      display: grid;
      width: 800px;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;

      .tag-pill {
        display: flex;
        border-radius: 10px;
        transition: all 0.2s ease;
        height: 85px;
        padding: 8px 10px;
        align-items: center;
        justify-content: center;
        background: linear-gradient(180deg, #ffffff 0%, #fce7ec 100%);
        color: #c92a52;
        user-select: none;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 1px rgba(0, 0, 0, 0.03) inset;
        text-decoration: none;
        box-sizing: border-box;
        line-height: 1.4;
        white-space: pre-line;

        .tag-content {
          display: inline;
          text-align: center;
          width: 100%;
        }

        br {
          display: block;
          height: 8px;
          content: '';
          margin: 4px 0;
        }

        .small-text {
          display: block;
          line-height: 1.2;
          margin-top: 4px;
        }
      }

      .active {
        display: flex;
        height: auto;
        padding: 8px 10px;
        align-items: center;
        justify-content: center;
        background: linear-gradient(180deg, #c92a52 0%, #a8163c 100%);
        color: #fff;
        box-shadow: 0 6px 16px rgba(168, 22, 60, 0.26);
        width: 100%;
        box-sizing: border-box;
        line-height: 1.4;
        white-space: pre-line;

        .tag-content {
          display: inline;
          text-align: center;
          width: 100%;
        }

        .small-text {
          color: #fff;
        }
      }

      .disabled {
        padding: 8px 10px;
        background: linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%);
        color: #9ca3af;
        cursor: not-allowed;
        box-shadow: none;
        width: 100%;
        box-sizing: border-box;
        line-height: 1.4;
        white-space: pre-line;

        .tag-content {
          display: inline;
          text-align: center;
          width: 100%;
        }

        .small-text {
          color: #9ca3af;
        }
      }
    }

    .search-container {
      display: flex;
      gap: 12px;
      width: 1200px;
      margin-top: 30px;

      .search-input {
        flex: 1;

        :deep(.el-input__wrapper) {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          height: 48px;
          padding: 6px 14px;
          font-size: 15px;
        }
      }

      .search-btn {
        border-radius: 8px;
        padding: 0 24px;
        font-weight: 500;
        height: 48px;
      }
    }
  }
}

@media (max-width: 1200px) {
  .search-nav {
    .search-card {
      .search-container {
        width: 100%;
        max-width: 1000px;
      }
    }
  }
}

/* PC端统一字号（不影响平板和手机） */
@media (min-width: 1025px) {
  .search-nav {
    top: 18px;
    margin-bottom: 28px;

    .search-card {
      .search-tags {
        width: 760px;
        gap: 10px;

        .tag-pill {
          height: 76px;
          padding: 6px 10px;
        }

        .active,
        .disabled {
          padding: 6px 10px;
        }

        .tag-pill,
        .active,
        .disabled {
          font-size: var(--aw-font-16);
        }
      }

      .search-container {
        width: 1120px;
        margin-top: 24px;

        .search-input {
          :deep(.el-input__wrapper) {
            height: 42px;
            padding: 4px 12px;
            font-size: 14px;
          }
        }

        .search-btn {
          height: 42px;
        }
      }
    }
  }
}

/* 响应式适配：平板（768px-1024px） */
@media (min-width: 768px) and (max-width: 1024px) {
  .search-nav {
    display: flex;
    justify-content: center;
    bottom: 16px;
    margin-bottom: 20px;

    .search-card {
      max-width: 720px;

      .search-tags {
        width: 100%;
        grid-template-columns: repeat(4, 1fr);

        .tag-pill {
          width: 160px;
        }

        .small-text {
          font-size: 12px;
        }

        .tag-pill,
        .active,
        .disabled {
          font-size: 13px;
          padding: 6px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1.4;
          white-space: pre-line;
        }

        .tag-pill .tag-content,
        .active .tag-content,
        .disabled .tag-content {
          display: inline;
          text-align: center;
          width: 100%;
        }

        .tag-pill br,
        .active br,
        .disabled br {
          height: 6px;
          margin: 3px 0;
        }
      }
    }

    .search-container {
      width: 100%;
    }
  }
}

@media (max-width: 767px) {
  .search-nav {
    position: static;
    width: 100%;
    transform: none;
    z-index: auto;
    padding: 8px 12px 20px;
    top: auto;
    margin-bottom: 0;

    .search-card {
      max-width: 95vw;
      margin-top: 8px;

      .search-tags {
        gap: 6px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;

        .tag-pill {
          font-size: 16px;
          width: 100%;
          min-width: 0;
        }

        .tag-pill,
        .active,
        .disabled {
          padding: 6px 10px;
          line-height: 1.4;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: pre-line;
        }

        .tag-pill .tag-content,
        .active .tag-content,
        .disabled .tag-content {
          display: inline;
          text-align: center;
          width: 100%;
        }

        .tag-pill br,
        .active br,
        .disabled br {
          height: 6px;
          margin: 3px 0;
        }
      }
    }

    .search-container {
      flex-direction: column;
      gap: 8px;
      width: 100%;

      .search-input {
        width: 100%;
      }

      .search-btn {
        width: 100%;
      }
    }
  }
}

/* 超小屏幕设备适配（iPhone 4、iPhone 5、iPhone SE等，<=375px） */
@media (max-width: 375px) {
  .search-nav {
    padding: 6px 8px 20px;

    .search-card {
      max-width: 98vw;

      .tag-pill,
      .active,
      .disabled {
        padding: 4px 8px;
        line-height: 1.4;
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: pre-line;
      }

      .tag-pill .tag-content,
      .active .tag-content,
      .disabled .tag-content {
        display: inline;
        text-align: center;
        width: 100%;
      }

      .tag-pill br,
      .active br,
      .disabled br {
        height: 4px;
        margin: 2px 0;
      }
    }

  }
}

/* 极超小屏幕设备适配（iPhone 4等，<=320px） */
@media (max-width: 320px) {
  .search-nav {
    padding: 4px 6px 0;

    .search-card {
      max-width: 99vw;

      .search-tags {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 4px;
      }

      .tag-pill,
      .active,
      .disabled {
        padding: 3px 6px;
        font-size: 12px;
        line-height: 1.4;
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: pre-line;
      }

      .tag-pill .tag-content,
      .active .tag-content,
      .disabled .tag-content {
        display: inline;
        text-align: center;
        width: 100%;
      }

      .tag-pill br,
      .active br,
      .disabled br {
        height: 4px;
        margin: 2px 0;
      }
    }
  }
}
</style>