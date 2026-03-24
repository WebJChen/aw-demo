<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useNavStore } from '@/stores/navStore'
import { ItemDataDialog } from '@/components/dialogs/page/home'
import defaultImg from '@/assets/img/default.png'
import itemJson from '@/data/item.json'

const isExpanded = ref(false)
const navStore = useNavStore()
const { activeNav } = storeToRefs(navStore)
const itemDialogVisible = ref(false)
const selectedItem = ref(null)
const currentPage = ref(1)
const itemsPerPage = 15 // 5行 x 3列 = 15个
const activeSubNav = ref('葡萄酒类') // 默认选中葡萄酒类

// 响应式断点
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateWindowWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
})

// 判断设备类型
const isMobile = computed(() => windowWidth.value <= 768)
const isTablet = computed(() => windowWidth.value > 768 && windowWidth.value <= 1024)
const isDesktop = computed(() => windowWidth.value > 1024)

// 根据设备类型计算每页显示数量
const pageSize = computed(() => {
  if (isDesktop.value) return 15 // 5行 x 3列
  if (isTablet.value) return 10 // 5行 x 2列
  return 5 // 5行 x 1列 (手机端)
})

// 获取所有项目数据
const allItems = computed(() => {
  const items = []
  const category = itemJson.find(item => item.navName === activeNav.value)
  if (category && category.subNavList) {
    category.subNavList.forEach(subNav => {
      // 根据当前选中的子导航过滤数据
      let shouldInclude = false
      switch (activeSubNav.value) {
        case '葡萄酒类':
          shouldInclude = subNav.subNavName.includes('葡萄酒')
          break
        case '洋酒类':
          shouldInclude = subNav.subNavName.includes('洋酒')
          break
        case '其它酒类':
          shouldInclude = !subNav.subNavName.includes('葡萄酒') && !subNav.subNavName.includes('红酒') && !subNav.subNavName.includes('白酒') && !subNav.subNavName.includes('洋酒') && !subNav.subNavName.includes('威士忌') && !subNav.subNavName.includes('白兰地') && !subNav.subNavName.includes('伏特加')
          break
        default:
          shouldInclude = true
      }

      if (shouldInclude && subNav.itemData) {
        subNav.itemData.forEach(item => {
          items.push({
            ...item,
            subNavName: subNav.subNavName
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

// 分页导航
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
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
  activeSubNav.value = subNav
  resetPage() // 切换子导航时重置页码
}
</script>

<template>
  <div class="category-detail-panel w100">
    <div class="toggle-btn pointer" @click="toggleExpand">
      <span class="toggle-text">{{ isExpanded ? '点击收起' : '点击展开本州全部相关类别酒庄' }}</span>
      <el-icon class="toggle-icon" :class="{ 'rotate': isExpanded }">
        <ArrowDown v-if="!isExpanded" />
        <ArrowUp v-else />
      </el-icon>
    </div>

    <!-- 酒类子导航 -->
    <div v-if="isExpanded" class="alcohol-subnav">
      <div class="subnav-item" :class="{ 'active': activeSubNav === '葡萄酒类' }" @click="handleSubNavClick('葡萄酒类')">葡萄酒类
      </div>
      <div class="subnav-item" :class="{ 'active': activeSubNav === '洋酒类' }" @click="handleSubNavClick('洋酒类')">洋酒类</div>
      <div class="subnav-item" :class="{ 'active': activeSubNav === '其它酒类' }" @click="handleSubNavClick('其它酒类')">其它酒类
      </div>
    </div>

    <div class="category-content" :class="{ 'expanded': isExpanded }">
      <div v-for="category in categoryList" :key="category.id" class="category-section bgfff">
        <h3 class="category-title">{{ category.navName }}</h3>

        <!-- 分页内容 -->
        <div class="items-grid">
          <div v-for="(item, index) in paginatedItems" :key="index" class="item-card pointer"
            @click="openWineryDetail(item)">
            <div class="item-header">
              <span class="item-title">{{ item.title }}</span>
              <span class="item-en-title">{{ item.enTitle }}</span>
            </div>
            <div class="item-body">
              <p class="item-info-title">{{ item.itemData?.dialogInfoTitle }}</p>
              <p class="item-desc">{{ item.itemData?.desc }}</p>
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
          transition: all 0.3s ease;
          cursor: pointer;

          &:hover {
            background: linear-gradient(180deg, #e6f7f6 0%, #d4f1ef 100%);
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(51, 177, 163, 0.2);
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
