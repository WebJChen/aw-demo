<script setup>
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useNavStore } from '@/stores/navStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { ItemDataDialog } from '@/components/dialogs/page/home'
import defaultImg from '@/assets/img/default.png'
import itemJson from '@/data/item.json'

const isExpanded = ref(false)
const navStore = useNavStore()
const { activeNav, activeCategoryType } = storeToRefs(navStore)
const itemDialogVisible = ref(false)
const selectedItem = ref(null)
const currentPage = ref(1)
const panelRef = ref(null)
let panelHitTimer = null
const deviceStore = useDeviceStore()
const { isPhone, isTablet } = storeToRefs(deviceStore)

onUnmounted(() => {
  clearPanelHitState()
})

// 判断设备类型
const isDesktop = computed(() => !isPhone.value && !isTablet.value)

// 根据设备类型计算每页显示数量
const pageSize = computed(() => {
  if (isDesktop.value) return 15 // 5行 x 3列
  if (isTablet.value) return 10 // 5行 x 2列
  return 5 // 5行 x 1列 (手机端)
})

const getSubNavItems = (subNav) => {
  if (Array.isArray(subNav?.info)) return subNav.info
  if (Array.isArray(subNav?.itemData)) return subNav.itemData
  return []
}

const getItemInfo = (item) => item?.info || item?.itemData || null

// 获取所有项目数据
const allItems = computed(() => {
  const items = []
  const category = itemJson.find(item => item.navName === activeNav.value)
  if (category && category.subNavList) {
    category.subNavList.forEach(subNav => {
      // 根据当前选中的子导航过滤数据
      let shouldInclude = false
      switch (activeCategoryType.value) {
        case '葡萄酒酒庄':
          shouldInclude = subNav.subNavName.includes('葡萄酒')
          break
        case '洋酒酒庄':
          shouldInclude = subNav.subNavName.includes('洋酒')
          break
        case '其它酒类酒庄':
          shouldInclude = !subNav.subNavName.includes('葡萄酒') && !subNav.subNavName.includes('红酒') && !subNav.subNavName.includes('白酒') && !subNav.subNavName.includes('洋酒') && !subNav.subNavName.includes('威士忌') && !subNav.subNavName.includes('白兰地') && !subNav.subNavName.includes('伏特加')
          break
        default:
          shouldInclude = true
      }

      const subNavItems = getSubNavItems(subNav)
      if (shouldInclude && subNavItems.length) {
        subNavItems.forEach((item, itemIndex) => {
          items.push({
            ...item,
            subNavName: subNav.subNavName,
            __hitKey: `item__${category.path}__${subNav.subNavPath}__${itemIndex}`
          })
        })
      }
    })
  }
  return items
})

// 总页数
const totalPages = computed(() => Math.ceil(allItems.value.length / pageSize.value))

// 当前页的数据
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return allItems.value.slice(start, end)
})

// 重置页码当导航变化时
const resetPage = () => {
  currentPage.value = 1
}

const categoryList = computed(() => {
  return itemJson.filter(item => item.navName === activeNav.value)
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) {
    resetPage()
  }
}

const openWineryDetail = (item) => {
  selectedItem.value = item || null
  itemDialogVisible.value = true
}

const clearPanelHitState = () => {
  if (panelHitTimer) {
    clearTimeout(panelHitTimer)
    panelHitTimer = null
  }
  const highlighted = panelRef.value?.querySelectorAll?.('.search-hit-active') || []
  highlighted.forEach((el) => el.classList.remove('search-hit-active'))
}

const playPanelHitHighlight = (targetEl, fallbackMs = 1800) => {
  return new Promise((resolve) => {
    if (!targetEl) {
      resolve()
      return
    }
    clearPanelHitState()
    targetEl.classList.add('search-hit-active')

    let done = false
    const cleanup = () => {
      if (done) return
      done = true
      targetEl.removeEventListener('animationend', onAnimationEnd)
      targetEl.classList.remove('search-hit-active')
      if (panelHitTimer) {
        clearTimeout(panelHitTimer)
        panelHitTimer = null
      }
      resolve()
    }

    const onAnimationEnd = () => cleanup()
    targetEl.addEventListener('animationend', onAnimationEnd, { once: true })
    panelHitTimer = setTimeout(cleanup, fallbackMs)
  })
}

const getAlcoholTypeBySubNavName = (subNavName = '') => {
  if (subNavName.includes('葡萄酒')) return '葡萄酒酒庄'
  if (subNavName.includes('洋酒')) return '洋酒酒庄'
  return '其它酒类酒庄'
}

const focusByHit = async (hitKey) => {
  if (typeof hitKey !== 'string' || !hitKey.startsWith('item__')) return false
  const [sourceType, regionPath, subNavPath, indexStr] = hitKey.split('__')
  if (sourceType !== 'item' || !regionPath || !subNavPath) return false

  const region = itemJson.find((item) => item.path === regionPath)
  if (!region) return false
  const subNav = region.subNavList?.find((item) => item.subNavPath === subNavPath)
  if (!subNav) return false

  const targetIndex = Number(indexStr)
  const targetItem = getSubNavItems(subNav)?.[targetIndex]
  if (!targetItem) return false

  isExpanded.value = true
  navStore.setActiveCategoryType(getAlcoholTypeBySubNavName(subNav.subNavName || ''))
  await nextTick()

  const allIndex = allItems.value.findIndex((item) => item.__hitKey === hitKey)
  if (allIndex < 0) return false
  currentPage.value = Math.floor(allIndex / pageSize.value) + 1

  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))

  const targetEl = panelRef.value?.querySelector?.(`[data-winery-hit-key="${hitKey}"]`)
  if (!targetEl) return false

  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  void targetEl.offsetWidth
  await playPanelHitHighlight(targetEl)
  openWineryDetail(targetItem)
  return true
}

defineExpose({
  focusByHit
})

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

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const handleSubNavClick = (subNav) => {
  navStore.setActiveCategoryType(subNav)
  resetPage() // 切换子导航时重置页码
}
</script>

<template>
  <div ref="panelRef" class="category-detail-panel w100">
    <div class="toggle-btn pointer" @click="toggleExpand">
      <span class="toggle-text">{{ isExpanded ? '点击收起' : '点击展开本州全部相关类别酒庄' }}</span>
      <el-icon class="toggle-icon" :class="{ 'rotate': isExpanded }">
        <ArrowDown v-if="!isExpanded" />
        <ArrowUp v-else />
      </el-icon>
    </div>

    <!-- 酒类子导航 -->
    <div v-if="isExpanded" class="alcohol-subnav">
      <div class="subnav-item" :class="{ 'active': activeCategoryType === '葡萄酒酒庄' }" @click="handleSubNavClick('葡萄酒酒庄')">
        葡萄酒酒庄
      </div>
      <div class="subnav-item" :class="{ 'active': activeCategoryType === '洋酒酒庄' }" @click="handleSubNavClick('洋酒酒庄')">洋酒酒庄
      </div>
      <div class="subnav-item" :class="{ 'active': activeCategoryType === '其它酒类酒庄' }" @click="handleSubNavClick('其它酒类酒庄')">
        其它酒类酒庄
      </div>
    </div>

    <div class="category-content" :class="{ 'expanded': isExpanded }">
      <div v-for="category in categoryList" :key="category.id" class="category-section bgfff">
        <h3 class="category-title">{{ category.navName }}</h3>

        <!-- 分页内容 -->
        <div class="items-grid">
          <div v-for="(item, index) in paginatedItems" :key="index" class="item-card pointer"
            :data-winery-hit-key="item.__hitKey" @click="openWineryDetail(item)">
            <div class="item-header">
              <span class="item-title">{{ item.title }}</span>
              <span class="item-en-title">{{ item.enTitle }}</span>
            </div>
            <div class="item-body">
              <p class="item-info-title">{{ getItemInfo(item)?.dialogInfoTitle }}</p>
              <p class="item-desc">{{ getItemInfo(item)?.desc }}</p>
            </div>
          </div>
        </div>

        <!-- 分页控制 -->
        <div v-if="totalPages > 1" class="pagination-section">
          <div class="custom-pagination">
            <el-button class="page-btn" :disabled="currentPage === 1" @click="prevPage" size="small">
              上一页
            </el-button>
            <div class="page-indicator">
              <span class="page-num">{{ currentPage }}</span>
              <span class="page-total">/ {{ totalPages }}</span>
            </div>
            <el-button class="page-btn" :disabled="currentPage === totalPages" @click="nextPage" size="small">
              下一页
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ItemDataDialog v-model:visible="itemDialogVisible" :title="selectedItem?.title || ''"
    :en-title="selectedItem?.enTitle || ''" :banner="resolveImageUrl(selectedItem?.img)"
    :item-data="selectedItem ? [selectedItem] : []" />
</template>

<style scoped lang="scss">
.category-detail-panel {
  max-width: 1200px;
  margin: 0 auto 40px;
  padding: 0 20px;

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(180deg, #33b1a3 0%, #279486 100%);
    color: #fff;
    border-radius: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(51, 177, 163, 0.3);
    font-size: 16px;
    font-weight: 500;
    user-select: none;

    &:hover {
      background: linear-gradient(180deg, #2da099 0%, #238377 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(51, 177, 163, 0.4);
    }

    &:active {
      transform: translateY(0);
    }

    .toggle-text {
      flex: 1;
      text-align: center;
    }

    .toggle-icon {
      font-size: 20px;
      transition: transform 0.3s ease;

      &.rotate {
        transform: rotate(180deg);
      }
    }
  }

  .alcohol-subnav {
    display: flex;
    gap: 0;
    margin-top: 12px;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .subnav-item {
      flex: 1;
      padding: 10px 20px;
      text-align: center;
      background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
      color: #666;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      border-right: 1px solid #e0e0e0;

      &:last-child {
        border-right: none;
      }

      &:hover {
        background: linear-gradient(180deg, #e6f7f6 0%, #d4f1ef 100%);
        color: #33b1a3;
      }

      &.active {
        background: linear-gradient(180deg, #33b1a3 0%, #279486 100%);
        color: #fff;
        box-shadow: 0 2px 4px rgba(51, 177, 163, 0.3);
      }
    }
  }

  .category-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.5s ease, opacity 0.3s ease;
    opacity: 0;
    margin-top: 0;

    &.expanded {
      max-height: none;
      opacity: 1;
      margin-top: 20px;
    }

    .category-section {
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

      .category-title {
        font-size: 22px;
        font-weight: 600;
        color: #33b1a3;
        margin: 0 0 20px 0;
        padding-bottom: 12px;
        border-bottom: 2px solid #f0f0f0;
      }

      .items-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 20px;

        .item-card {
          background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 8px;
          padding: 16px;
          border: 2px solid transparent;
          transition: all 0.3s ease;
          cursor: pointer;

          &:hover {
            background: linear-gradient(180deg, #e6f7f6 0%, #d4f1ef 100%);
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(51, 177, 163, 0.2);
          }

          &.search-hit-active {
            border-color: #33b1a3;
            box-shadow: 0 0 0 3px rgba(51, 177, 163, 0.22), 0 10px 26px rgba(51, 177, 163, 0.24);
            animation: panelHitPulse 1.6s ease;
          }

          .item-header {
            margin-bottom: 12px;

            .item-title {
              display: block;
              font-size: 16px;
              font-weight: 600;
              color: #333;
              margin-bottom: 4px;
            }

            .item-en-title {
              display: block;
              font-size: 13px;
              color: #999;
            }
          }

          .item-body {
            .item-info-title {
              font-size: 13px;
              color: #666;
              margin: 0 0 8px 0;
              font-weight: 500;
            }

            .item-desc {
              font-size: 13px;
              color: #888;
              margin: 0;
              line-height: 1.5;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          }
        }
      }

      .pagination-section {
        display: flex;
        justify-content: center;
        padding-top: 20px;
        border-top: 1px solid #f0f0f0;

        .custom-pagination {
          display: flex;
          align-items: center;
          gap: 16px;

          .page-btn {
            background: linear-gradient(180deg, #33b1a3 0%, #279486 100%);
            border: none;
            color: #fff;

            &:hover:not(:disabled) {
              background: linear-gradient(180deg, #2da099 0%, #238377 100%);
            }

            &:disabled {
              background: #e5e7eb;
              color: #9ca3af;
            }
          }

          .page-indicator {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 16px;
            color: #666;

            .page-num {
              font-weight: 600;
              color: #33b1a3;
              font-size: 18px;
            }

            .page-total {
              color: #999;
            }
          }
        }
      }
    }
  }
}

@keyframes panelHitPulse {
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

// 平板端适配 (768px - 1024px)
@media (max-width: 1024px) {
  .category-detail-panel {
    padding: 0 15px;

    .alcohol-subnav {
      margin-top: 11px;

      .subnav-item {
        padding: 11px 18px;
        font-size: 14px;
      }
    }

    .category-content {
      .category-section {
        padding: 20px;

        .category-title {
          font-size: 20px;
        }

        .items-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;

          .item-card {
            padding: 18px;

            .item-header {
              .item-title {
                font-size: 17px;
              }

              .item-en-title {
                font-size: 14px;
              }
            }

            .item-body {
              .item-info-title {
                font-size: 14px;
              }

              .item-desc {
                font-size: 14px;
              }
            }
          }
        }

        .pagination-section {
          .custom-pagination {
            .page-indicator {
              font-size: 15px;

              .page-num {
                font-size: 17px;
              }
            }
          }
        }
      }
    }
  }
}

// 手机端适配 (<= 768px)
@media (max-width: 768px) {
  .category-detail-panel {
    padding: 0 12px;

    .toggle-btn {
      padding: 14px 20px;
      font-size: 17px;

      .toggle-icon {
        font-size: 22px;
      }
    }

    .alcohol-subnav {
      margin-top: 10px;

      .subnav-item {
        padding: 12px 16px;
        font-size: 15px;
      }
    }

    .category-content {
      &.expanded {
        margin-top: 15px;
      }

      .category-section {
        padding: 18px;
        margin-bottom: 16px;

        .category-title {
          font-size: 20px;
        }

        .items-grid {
          grid-template-columns: 1fr;
          gap: 16px;

          .item-card {
            padding: 18px;

            .item-header {
              margin-bottom: 14px;

              .item-title {
                font-size: 18px;
                margin-bottom: 6px;
              }

              .item-en-title {
                font-size: 15px;
              }
            }

            .item-body {
              .item-info-title {
                font-size: 15px;
                margin-bottom: 10px;
              }

              .item-desc {
                font-size: 15px;
                line-height: 1.6;
              }
            }
          }
        }

        .pagination-section {
          padding-top: 24px;

          .custom-pagination {
            gap: 20px;

            .page-btn {
              padding: 10px 18px;
              font-size: 15px;
            }

            .page-indicator {
              font-size: 16px;

              .page-num {
                font-size: 20px;
              }

              .page-total {
                font-size: 16px;
              }
            }
          }
        }
      }
    }
  }
}

// 超小屏幕设备适配 (<= 375px)
@media (max-width: 375px) {
  .category-detail-panel {
    padding: 0 10px;

    .toggle-btn {
      padding: 12px 16px;
      font-size: 16px;

      .toggle-icon {
        font-size: 20px;
      }
    }

    .alcohol-subnav {
      margin-top: 8px;

      .subnav-item {
        padding: 10px 12px;
        font-size: 13px;
      }
    }

    .category-content {
      .category-section {
        padding: 16px;

        .category-title {
          font-size: 18px;
        }

        .items-grid {
          gap: 14px;

          .item-card {
            padding: 16px;

            .item-header {
              .item-title {
                font-size: 17px;
              }

              .item-en-title {
                font-size: 14px;
              }
            }

            .item-body {
              .item-info-title {
                font-size: 14px;
              }

              .item-desc {
                font-size: 14px;
              }
            }
          }
        }

        .pagination-section {
          .custom-pagination {
            .page-btn {
              padding: 8px 14px;
              font-size: 14px;
            }

            .page-indicator {
              font-size: 15px;

              .page-num {
                font-size: 18px;
              }
            }
          }
        }
      }
    }
  }
}
</style>
