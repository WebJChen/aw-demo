<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cartStore'
import { useDeviceStore } from '@/stores/deviceStore'
import defaultImg from '@/assets/img/default.png'
import { resolveDataImage } from '@/utils/dataImageResolver'

const cartStore = useCartStore()
const { cartItems, totalAmount, totalQuantity } = storeToRefs(cartStore)
const deviceStore = useDeviceStore()
const { isPhone } = storeToRefs(deviceStore)

const currentPage = ref(1)
const pageSize = computed(() => (isPhone.value ? 4 : 8))
const totalItems = computed(() => cartItems.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return cartItems.value.slice(start, start + pageSize.value)
})

onMounted(() => {
  deviceStore.startListen()
})

onUnmounted(() => {
  deviceStore.stopListen()
})

watch([totalItems, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
  if (currentPage.value < 1) currentPage.value = 1
})

const handlePageChange = (page) => {
  currentPage.value = page
}

const resolveImageUrl = (img) => resolveDataImage(img, defaultImg)
</script>

<template>
  <div class="cart-page">
    <div class="cart-header">
      <h1>购物车</h1>
      <p>已选择 {{ totalQuantity }} 件测试酒款，可在本地临时保存。</p>
    </div>

    <div class="cart-content">
      <template v-if="totalItems > 0">
        <div class="cart-toolbar">
          <el-button text type="danger" @click="cartStore.clearCart()">清空购物车</el-button>
        </div>

        <article v-for="item in pagedItems" :key="item.cartId" class="cart-card">
          <img :src="resolveImageUrl(item.img)" :alt="item.title" class="card-cover">
          <div class="card-main">
            <div class="card-title-row">
              <h3>{{ item.title }}</h3>
              <span v-if="item.enTitle" class="en-title">{{ item.enTitle }}</span>
            </div>
            <p v-if="item.desc" class="card-desc">{{ item.desc }}</p>
            <div class="card-meta">{{ item.regionName }} / {{ item.subNavName }}</div>
            <div class="card-actions">
              <span class="price">$ {{ Number(item.price).toFixed(2) }}</span>
              <el-input-number :model-value="item.quantity" :min="1" :step="1" size="small"
                @update:model-value="(value) => cartStore.updateQuantity(item.cartId, value)" />
              <el-button text type="danger" @click="cartStore.removeCartItem(item.cartId)">移除</el-button>
            </div>
          </div>
        </article>

        <div class="pagination-wrapper" v-if="totalItems > pageSize">
          <el-pagination :current-page="currentPage" :page-size="pageSize" :total="totalItems"
            layout="prev, pager, next" background @current-change="handlePageChange" />
        </div>

        <div class="cart-summary">
          <div class="summary-info">合计（测试）：A$ {{ Number(totalAmount).toFixed(2) }}</div>
          <el-button type="primary">去结算</el-button>
        </div>
      </template>

      <div v-else class="empty-state">
        <p>购物车为空，可在酒款详情弹窗右下角点击“加入购物车”。</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cart-page {
  width: 90%;
  margin: 40px auto 80px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cart-header {
  padding: 20px 24px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 16px;
    bottom: 16px;
    width: 4px;
    border-radius: 999px;
    background: #33b1a3;
  }

  h1 {
    margin: 0 0 2px;
    font-size: 28px;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: 1px;
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }
}

.cart-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cart-toolbar {
  display: flex;
  justify-content: flex-end;
}

.cart-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  padding: 16px;
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 16px;
}

.card-cover {
  width: 100%;
  height: 120px;
  border-radius: 10px;
  object-fit: cover;
}

.card-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;

  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 18px;
  }
}

.en-title {
  color: #64748b;
  font-size: 13px;
}

.card-desc {
  margin: 0;
  color: #334155;
  line-height: 1.6;
}

.card-meta {
  color: #0f766e;
  font-size: 13px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.price {
  min-width: 110px;
  color: #279486;
  font-size: 18px;
  font-weight: 700;
}

.cart-summary {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.summary-info {
  font-size: 18px;
  color: #0f172a;
  font-weight: 700;
}

.empty-state {
  text-align: center;
  font-size: 16px;
  color: #64748b;
  padding: 34px 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 0;
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

@media (max-width: 768px) {
  .cart-page {
    width: 95%;
    margin-top: 28px;
  }

  .cart-card {
    grid-template-columns: 1fr;
  }

  .card-cover {
    height: 190px;
  }

  .card-actions {
    flex-wrap: wrap;
  }

  .cart-summary {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
</style>
