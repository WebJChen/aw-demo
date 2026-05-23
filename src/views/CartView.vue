<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCartStore } from '@/stores/cartStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { resolveDataImage } from '@/utils/dataImageResolver'
import { saveSearchTarget } from '@/utils/searchUtils'
import { withRandomLoading } from '@/utils/loadingUtils'

const cartStore = useCartStore()
const { cartItems, selectedQuantity, selectedAmount, isAllSelected } = storeToRefs(cartStore)
const deviceStore = useDeviceStore()
const { isPhone } = storeToRefs(deviceStore)
const router = useRouter()

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
  void withRandomLoading(undefined, { min: 0, max: 500 })
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

const resolveImageUrl = (img) => resolveDataImage(img, undefined, { variant: 'thumb' })
const formatMoney = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0.00'
  return amount.toFixed(2)
}

const handleSelectAllChange = (checked) => {
  cartStore.setAllSelected(checked)
}

const openItemLocation = (item) => {
  const regionPath = item?.regionPath || ''
  const subNavPath = item?.subNavPath || ''
  const hitKey = typeof item?.sourceHitKey === 'string' ? item.sourceHitKey : ''
  if (!regionPath || !subNavPath) {
    ElMessage.warning('当前条目缺少定位信息，暂无法跳转')
    return
  }

  if (!hitKey) {
    const href = router.resolve({
      name: regionPath,
      params: { subNav: subNavPath }
    }).href
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }

  const sourceType = hitKey.startsWith('item__') ? 'item' : 'wine'
  saveSearchTarget({
    hit: hitKey,
    sourceType,
    pending: true,
    regionPath,
    subNavPath,
    ts: Date.now()
  })

  const href = router.resolve({
    name: regionPath,
    params: { subNav: subNavPath },
    query: { hit: hitKey }
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

const goCheckout = () => {
  if (!selectedQuantity.value) {
    ElMessage.warning('请先勾选要结算的商品')
    return
  }
  router.push({ name: 'Checkout' })
}
</script>

<template>
  <div class="cart-page">
    <div class="cart-header">
      <h1>购物车</h1>
      <p>已选择 {{ selectedQuantity }} 件，可在本地临时保存。</p>
    </div>

    <div class="cart-content" v-if="totalItems > 0">
      <section class="cart-main-panel">
        <div class="cart-table-head">
          <span>商品信息</span>
          <span>单价（元）</span>
          <span>数量</span>
          <span>小计（元）</span>
          <span>操作</span>
          <span>选择</span>
        </div>

        <article v-for="item in pagedItems" :key="item.cartId" class="cart-row" :class="{ selected: item.selected }">
          <div class="row-product">
            <el-image :src="resolveImageUrl(item.img)" :alt="item.title" class="card-cover" fit="cover"
              :preview-src-list="[resolveImageUrl(item.img)]" :preview-teleported="true" />
            <div class="product-info">
              <h3 class="title-link" @click="openItemLocation(item)">{{ item.title }}</h3>
              <span v-if="item.enTitle" class="en-title">{{ item.enTitle }}</span>
              <p v-if="item.desc" class="card-desc">{{ item.desc }}</p>
              <div v-if="item.wineOrigin || item.wineVintage" class="card-wine-meta">
                <span v-if="item.wineOrigin" class="wine-meta-line">产地：{{ item.wineOrigin }}</span>
                <span v-if="item.wineVintage" class="wine-meta-line">年份：{{ item.wineVintage }}</span>
              </div>
              <div class="card-meta">{{ item.regionName }} / {{ item.subNavName }}</div>
            </div>
          </div>

          <div class="row-price">¥ {{ formatMoney(item.price) }}</div>
          <div class="row-qty">
            <el-input-number :model-value="item.quantity" :min="1" :step="1" size="small"
              @update:model-value="(value) => cartStore.updateQuantity(item.cartId, value)" />
          </div>
          <div class="row-subtotal">¥ {{ formatMoney((Number(item.price) || 0) * (Number(item.quantity) || 0)) }}</div>
          <div class="row-action">
            <el-button text type="danger" @click="cartStore.removeCartItem(item.cartId)">移除</el-button>
          </div>
          <div class="row-select">
            <el-checkbox class="action-select" :model-value="item.selected"
              @change="(checked) => cartStore.setItemSelected(item.cartId, checked)" />
          </div>
        </article>

        <div class="pagination-wrapper" v-if="totalItems > pageSize">
          <el-pagination :current-page="currentPage" :page-size="pageSize" :total="totalItems"
            layout="prev, pager, next" background @current-change="handlePageChange" />
        </div>

        <div class="cart-main-select">
          <el-button text type="danger" class="clear-cart-btn" @click="cartStore.clearCart()">清空购物车</el-button>
          <div class="all-select-wrap">
            <span class="all-select-text">全选（{{ selectedQuantity }}）</span>
            <el-checkbox class="all-select" :model-value="isAllSelected" @change="handleSelectAllChange" />
          </div>
        </div>
      </section>

      <aside class="cart-side-panel">
        <div class="side-header">
          <h3>结算信息</h3>
        </div>
        <div class="summary-row summary-row--selected-qty selected">
          <span>已选数量</span>
          <strong>{{ selectedQuantity }} 件</strong>
        </div>
        <div class="summary-row summary-row--selected-amount selected">
          <span>总价</span>
          <strong>¥ {{ formatMoney(selectedAmount) }}</strong>
        </div>
        <el-button type="primary" class="checkout-btn" @click="goCheckout">去结算</el-button>
      </aside>
    </div>

    <div class="cart-content cart-content--empty" v-else>
      <div class="empty-state">
        <p>购物车为空时，可从酒款网格卡片或详情弹窗中点击「加入购物车」；侧边电梯也可直达本页。</p>
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
  border-radius: 0;
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
    border-radius: 0;
    background: #c92a52;
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
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 18px;
}

.cart-main-panel {
  background: #fff;
  border: none;
  border-radius: 0;
  padding: 0;
}

.cart-table-head {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1.1fr 1.1fr .8fr .6fr;
  align-items: center;
  min-height: 46px;
  padding: 0 16px;
  border-radius: 0;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 13px;
  font-weight: 600;
}

.cart-row {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1.1fr 1.1fr .8fr .6fr;
  align-items: center;
  padding: 20px 16px;
  border-bottom: 1px solid #f1f5f9;
  gap: 8px;
  background: #fff;
}

.cart-row.selected {
  background: #fff1f5;
}

.row-product {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  min-width: 0;
}

.product-info {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.product-info h3 {
  margin: 0;
  font-size: 17px;
  line-height: 1.5;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-link {
  display: block;
  width: 100%;
  max-width: 320px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.title-link:hover {
  color: #b6193e;
}

.row-price,
.row-subtotal {
  color: #d43a60;
  font-weight: 600;
}

.row-subtotal {
  color: #b6193e;
}

.card-cover {
  width: 94px;
  height: 94px;
  min-width: 94px;
  min-height: 94px;
  flex: 0 0 94px;
  border-radius: 0;
  object-fit: cover;
}

.card-cover :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.en-title {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 15px;
}

.card-desc {
  margin: 8px 0;
  color: #334155;
  font-size: 14px;
  line-height: 1.65;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.card-wine-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 6px 0 4px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.45;
}

.card-wine-meta .wine-meta-line {
  white-space: nowrap;
}

.card-meta {
  // display: inline-flex;
  // align-items: center;
  // padding: 2px 8px;
  // border: 1px solid #f3b4c6;
  // background: #ffe8ef;
  color: #8f1239;
  font-size: 14px;
  line-height: 1.5;
}

.row-qty :deep(.el-input-number) {
  width: 110px;
}

.row-action :deep(.el-button) {
  padding: 0;
}

.row-select {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  align-self: stretch;
  padding-left: 4px;
}

.row-select :deep(.el-checkbox) {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.row-select :deep(.el-checkbox__input) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0;
  vertical-align: middle;
  line-height: 1;
}

.action-select :deep(.el-checkbox__label),
.all-select :deep(.el-checkbox__label) {
  display: none;
}

.action-select :deep(.el-checkbox__inner),
.all-select :deep(.el-checkbox__inner) {
  position: relative;
  display: block;
  width: 24px;
  height: 24px;
  margin: 0;
  border: 2px solid #94a3b8;
}

.action-select :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
.all-select :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #a8163c;
  border-color: #a8163c;
}

.action-select :deep(.el-checkbox__inner::after),
.all-select :deep(.el-checkbox__inner::after) {
  left: 50%;
  top: 50%;
  width: 6px;
  height: 12px;
  border-width: 2.5px;
  transform: translate(-50%, -58%) rotate(45deg) scaleY(0);
  transform-origin: center;
}

.action-select :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after),
.all-select :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
  transform: translate(-50%, -58%) rotate(45deg) scaleY(1);
}

.action-select :deep(.el-checkbox__input.is-focus .el-checkbox__inner),
.all-select :deep(.el-checkbox__input.is-focus .el-checkbox__inner) {
  border-color: #a8163c;
}

.cart-main-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 0;
}

.all-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.all-select-text {
  color: #334155;
  font-size: 14px;
}

.cart-side-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  padding: 18px 16px;
  height: fit-content;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.cart-side-panel h3 {
  margin: 0;
  font-size: 22px;
  color: #1f2937;
}

.clear-cart-btn {
  padding: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #374151;
}

.summary-row span {
  font-size: 13px;
  color: #64748b;
}

.summary-row strong {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.summary-row.selected strong {
  color: #b6193e;
}

.summary-row--selected-amount span {
  font-size: 16px;
  color: #1f2937;
  font-weight: 600;
}

.summary-row--selected-amount strong {
  font-size: 22px;
  font-weight: 700;
}

.summary-row--selected-qty strong {
  font-size: 15px;
}

.summary-row--selected-qty span {
  font-size: 16px;
  color: #1f2937;
  font-weight: 600;
}

.checkout-btn {
  width: 100%;
  margin-top: 8px;
  height: 40px;
  border-radius: 0;
}

.empty-state {
  width: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 16px;
  color: #64748b;
  padding: 16px;
}

.cart-content--empty {
  display: block;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 0;
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

@media (max-width: 768px) {
  .cart-page {
    width: 95%;
    margin-top: 28px;
  }

  .cart-content {
    grid-template-columns: 1fr;
  }

  .cart-table-head {
    display: none;
  }

  .cart-row {
    grid-template-columns: 1fr;
    border: 1px solid #e5e7eb;
    border-radius: 0;
    margin-bottom: 10px;
  }

  .row-select {
    justify-content: flex-end;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .cart-page {
    width: 94%;
    margin-top: 20px;
  }

  .cart-content {
    grid-template-columns: 1fr 280px;
    gap: 14px;
  }

  .cart-table-head,
  .cart-row {
    grid-template-columns: 2.2fr .9fr 1fr 1fr .8fr .6fr;
  }

  .title-link {
    max-width: 240px;
  }

  .card-cover {
    width: 82px;
    height: 82px;
    min-width: 82px;
    min-height: 82px;
    flex: 0 0 82px;
  }

  .cart-side-panel h3 {
    font-size: 20px;
  }
}
</style>
