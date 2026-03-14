<script setup>
import { ref, computed } from 'vue';
import ServiceNav from '../components/ServiceNav.vue';

const subNavList = ['红酒', '白葡萄酒', '气泡酒', '威士忌', '其它洋酒', '苹果酒']

const dataList = [
  {
    title: '示例数据1',
    img: "",
    enTitle: "Example Data 1",
    sub: "示例数据1副标题"
  }, {
    title: '示例数据2',
    img: "",
    enTitle: "Example Data 2",
    sub: "示例数据2副标题"
  }, {
    title: '示例数据3',
    img: "",
    enTitle: "Example Data 3",
    sub: "示例数据3副标题"
  },
]

const gridRef = ref(null)

const currentPage = ref(1)
const scrollPage = ref(1)
const loadMoad = ref(false)
const isLoading = ref(false)
const windowWidth = ref(window.innerWidth)
// 每页显示的数量
const eachPageCount = computed(() => {
  if (windowWidth.value <= 768) {
    if (window.matchMedia('(orientation: portrait)').matches) {
      return 3
    } else {
      return 2
    }
  } else if (windowWidth.value <= 1024) {
    return 12
  } else {
    return 12
  }
})

const totalPages = ref(Math.max(1, Math.ceil(dataList.length / eachPageCount.value)))

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
    mobileScrollPage.value = 1
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
</script>

<template>
  <ServiceNav />
  <!-- eslint-disable-next-line vue/no-multiple-template-root -->
  <div class="content-box">
    <!-- 子导航 -->
    <div class="subnav-box center">
      <!-- 横向Tab列表 -->
      <ul class="subnav-list">
        <li v-for="(subItem, idx) in subNavList" :key="idx" class="subnav-item w100">
          {{ subItem }}
        </li>
      </ul>
    </div>

    <!-- 信息列表 -->
    <div ref="gridRef" class="info-list">
      <div v-for="(data, idx) in dataList" :key="idx" class="info-item pointer">
        <img src="@/assets/img/default.png" :alt="data.title" class="w100">
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
      left: 50%;
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