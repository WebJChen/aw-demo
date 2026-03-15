<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import ServiceNav from '../components/ServiceNav.vue';
import ItemDataDialog from '@/components/dialogs/ItemDataDialog.vue';
import { useDeviceStore } from '@/stores/deviceStore';
import { useNavStore } from '@/stores/navStore';
import defaultImg from '@/assets/img/default.png';

const subNavList = ['红酒', '白葡萄酒', '气泡酒', '威士忌', '其它洋酒', '苹果酒']
const subNavSlugMap = {
  红酒: 'red-wine',
  白葡萄酒: 'white-wine',
  气泡酒: 'sparkling-wine',
  威士忌: 'whisky',
  其它洋酒: 'other-spirits',
  苹果酒: 'cider'
}
const slugSubNavMap = Object.fromEntries(Object.entries(subNavSlugMap).map(([k, v]) => [v, k]))

const dataList = [
  {
    title: '示例数据1',
    img: "",
    enTitle: "Example Data 1",
    sub: "示例数据1副标题",
    itemData: [{
      "title": "葡萄酒酒庄示例1",
      "img": "",
      "enTitle": "",
      "info": {
        "name": "文本1",
        "desc": "描述1",
        "features": [
          {
            "icon": "#22c55e",
            "title": "地址",
            "desc": "addr"
          },
          {
            "icon": "#3b82f6",
            "title": "电话",
            "desc": "phone"
          },
          {
            "icon": "#f59e0b",
            "title": "营业时间",
            "desc": "opening time"
          }
        ],
        "tags": [
          "tag1",
          "tag2",
          "tag3"
        ]
      }
    },]
  }, {
    title: '示例数据2',
    img: "",
    enTitle: "Example Data 2",
    sub: "示例数据2副标题", itemData: [{
      "title": "葡萄酒酒庄示例2",
      "img": "",
      "enTitle": "",
      "info": {
        "name": "文本2",
        "desc": "描述2",
        "features": [
          {
            "icon": "#22c55e",
            "title": "地址",
            "desc": "addr"
          },
          {
            "icon": "#3b82f6",
            "title": "电话",
            "desc": "phone"
          },
          {
            "icon": "#f59e0b",
            "title": "营业时间",
            "desc": "opening time"
          }
        ],
        "tags": [
          "tag1",
          "tag2",
          "tag3"
        ]
      }
    },]
  }, {
    title: '示例数据3',
    img: "",
    enTitle: "Example Data 3",
    sub: "示例数据3副标题", itemData: [{
      "title": "葡萄酒酒庄示例3",
      "img": "",
      "enTitle": "",
      "info": {
        "name": "文本3",
        "desc": "描述3",
        "features": [
          {
            "icon": "#22c55e",
            "title": "地址",
            "desc": "addr"
          },
          {
            "icon": "#3b82f6",
            "title": "电话",
            "desc": "phone"
          },
          {
            "icon": "#f59e0b",
            "title": "营业时间",
            "desc": "opening time"
          }
        ],
        "tags": [
          "tag1",
          "tag2",
          "tag3"
        ]
      }
    },]
  },
]

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
const regionRouteNames = ['tasmania', 'new-south-wales', 'south-australia', 'western-australia', 'victoria', 'queensland', 'northern-territory', 'canberra']
const itemDialogVisible = ref(false)
const selectedItem = ref(null)

// 每页显示的数量
const eachPageCount = computed(() => {
  if (isPhone.value) {
    if (isPortrait.value) {
      return 3
    } else {
      return 2
    }
  } else {
    return 12
  }
})

const totalPages = computed(() => Math.max(1, Math.ceil(dataList.length / eachPageCount.value)))

// 更新页码
function updateScrollPage() {
  if (!gridRef.value) return
  //读取了暂定数据的长度
  const total = dataList.length
  if (total <= 0) {
    scrollPage.value = 1
    return
  }
  const per = eachPageCount.value || 1
  const totalPages = Math.max(1, Math.ceil(total / per))
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
  // 使用 Math.ceil 而不是 Math.floor，这样当滚动到某一页的第一行时就切换页码
  const page = Math.ceil(scrollOffset / pageHeight) + 1
  scrollPage.value = Math.min(totalPages, Math.max(1, page))
}

function checkHasMoreData() {
  loadMoad.value = (currentPage.value * eachPageCount.value) < dataList.length
}

const handleSubNavClick = (subItem) => {
  navStore.setActiveSubNav(subItem)
  if (typeof route.name === 'string' && regionRouteNames.includes(route.name)) {
    router.replace({
      name: route.name,
      params: {
        ...route.params,
        subNav: subNavSlugMap[subItem]
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

const applySubNavFromRoute = () => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  const routeSubNav = typeof route.params.subNav === 'string' ? route.params.subNav : ''

  if (routeSubNav && slugSubNavMap[routeSubNav]) {
    navStore.setActiveSubNav(slugSubNavMap[routeSubNav])
    return
  }

  if (routeName === 'Home') {
    navStore.setActiveNav('塔斯马尼亚州')
    navStore.setActiveSubNav(subNavList[0])
    return
  }

  if (routeName && regionRouteNames.includes(routeName)) {
    navStore.setActiveSubNav(subNavList[0])
    return
  }

  if (activeSubNav.value && subNavList.includes(activeSubNav.value)) return
  navStore.setActiveSubNav(subNavList[0])
}

onMounted(() => {
  deviceStore.startListen()
  applySubNavFromRoute()
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  requestAnimationFrame(() => {
    window.scrollTo({ top: navStore.scrollY, behavior: 'auto' })
    updateScrollPage()
  })
})

watch(() => [route.name, route.params.subNav], () => {
  applySubNavFromRoute()
})

onUnmounted(() => {
  deviceStore.stopListen()
  window.removeEventListener('scroll', handleWindowScroll)
  navStore.flushScrollY()
})
</script>

<template>
  <ServiceNav />
  <!-- eslint-disable-next-line vue/no-multiple-template-root -->
  <div class="content-box">
    <!-- 子导航 -->
    <div class="subnav-box center">
      <!-- 横向Tab列表 -->
      <ul class="subnav-list">
        <li v-for="(subItem, idx) in subNavList" :key="idx" class="subnav-item w100"
          :class="{ active: activeSubNav === subItem }" @click="handleSubNavClick(subItem)">
          {{ subItem }}
        </li>
      </ul>
    </div>

    <!-- 信息列表 -->
    <div ref="gridRef" class="info-list">
      <div v-for="(data, idx) in dataList" :key="idx" class="info-item pointer"
        @click="openItemDialog(data)" :data-title="data.title">
        <img :src="data.img || defaultImg" :alt="data.title" class="w100">
        <div class="info-title fs16" :title="data.title">{{ data.title }}</div>
        <div v-if="data.enTitle" class="info-sub" :title="data.enTitle">{{ data.enTitle }}</div>
      </div>
    </div>
    <!-- 分页 -->
    <div class="pagination-section pagination-section--scenic center">
      <div class="custom-pagination custom-pagination--fixed">
        <div class="page-indicator fs16">第 <span class="page-num fowe7">{{ scrollPage }}</span> / {{
          totalPages }} 页</div>
      </div>
    </div>
    <ItemDataDialog
      v-model:visible="itemDialogVisible"
      :title="selectedItem?.title || ''"
      :en-title="selectedItem?.enTitle || ''"
      :banner="selectedItem?.img || defaultImg"
      :item-data="selectedItem?.itemData || []"
    />
  </div>
</template>

<style scoped lang="scss">
.content-box {
  height: auto;
  color: #101010;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 90px;

  // 子导航容器
  .subnav-box {
    width: 90%;
    padding: 0 20px;

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

  // 信息列表
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
  }

  // 分页
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
      z-index: 100;
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
}
</style>