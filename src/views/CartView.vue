<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCartStore } from '@/stores/cartStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { resolveDataImage } from '@/utils/dataImageResolver'
/** 【样式测试·可删】塔斯购物车封面轮换；正式发布前移除本 import 与 cartCoverSrc 等（见 tasmaniaGridStyleTestThumbs.js） */
import { tasGridStyleTestThumbByIndex } from '@/utils/tasmaniaGridStyleTestThumbs'
import { saveSearchTarget } from '@/utils/searchUtils'

import { withRandomLoading } from '@/utils/loadingUtils'

const cartStore = useCartStore()
const { cartItems, selectedQuantity, selectedAmount, isAllSelected } = storeToRefs(cartStore)
const deviceStore = useDeviceStore()
const { isPhone, isMobile } = storeToRefs(deviceStore)
const router = useRouter()

const cartTableRef = ref(null)

const enrichedFilteredCart = computed(() =>
  cartItems.value.map((item) => ({
    ...item,
    _sortPrice: Number(item.price) || 0,
    _sortQty: Number(item.quantity) || 0,
    _sortLine: (Number(item.price) || 0) * (Number(item.quantity) || 0),
    _sortTitle: String(item.title || '')
  }))
)

/** 与 el-table 表头排序一致：先排全量再分页 */
const sortProp = ref('_sortLine')
const sortOrder = ref('descending')

const sortMultiplier = computed(() => (sortOrder.value === 'ascending' ? 1 : -1))

const sortedFullCartRows = computed(() => {
  const rows = [...enrichedFilteredCart.value]
  const prop = sortProp.value
  const mul = sortMultiplier.value
  if (!sortOrder.value || !prop) return rows

  rows.sort((a, b) => {
    if (prop === '_sortTitle') {
      return mul * String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN')
    }
    const va = Number(a[prop]) || 0
    const vb = Number(b[prop]) || 0
    return mul * (va - vb)
  })
  return rows
})

const onSortChange = ({ prop, order }) => {
  if (!prop) return
  if (!order) {
    sortProp.value = '_sortLine'
    sortOrder.value = 'descending'
    return
  }
  sortProp.value = prop
  sortOrder.value = order
}

const currentPage = ref(1)
const pageSize = computed(() => (isPhone.value ? 4 : 8))
const totalItems = computed(() => cartItems.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedFullCartRows.value.slice(start, start + pageSize.value)
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

/** 【样式测试·可删】仅 regionPath=tasmania 的条目：购物车封面两张图按购物车内顺序轮换（与 ItemGrid 同源素材） */
const isCartTasmaniaStyleTestCover = (item) => item?.regionPath === 'tasmania'

const cartCoverSrc = (item) => {
  if (item?.demoPersistent && typeof item?.img === 'string' && item.img.trim()) {
    return resolveImageUrl(item.img)
  }
  if (!isCartTasmaniaStyleTestCover(item)) return resolveImageUrl(item?.img)
  const idx = cartItems.value.findIndex((x) => x.cartId === item.cartId)
  return tasGridStyleTestThumbByIndex(idx >= 0 ? idx : 0)
}

const cartCoverFit = (item) => {
  if (item?.demoPersistent && typeof item?.img === 'string' && item.img.trim()) return 'cover'
  return isCartTasmaniaStyleTestCover(item) ? 'contain' : 'cover'
}

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

const tryRemoveCartLine = (item) => {
  if (item?.demoPersistent) {
    ElMessage.info('内置演示备货不可移除，可在列表中勾选后去结算（支付后本条仍会留在购物车）。')
    return
  }
  cartStore.removeCartItem(item.cartId)
}

const cartRowClassName = ({ row }) => {
  const parts = []
  if (row.selected) parts.push('cart-row--selected')
  if (row.demoPersistent) parts.push('cart-row--demo-pinned')
  return parts.join(' ')
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
      <p>
        列表顶部为<strong>内置演示备货</strong>（不写本地快照，清空/支付卸货后仍存在），可直接勾选后「去结算」；其余行为与您从酒款中加购的商品相同。
      </p>
      <p class="cart-header-sub">
        已选 {{ selectedQuantity }} 件 · 勾选金额 ¥ {{ formatMoney(selectedAmount) }}
      </p>
    </div>

    <div class="cart-content">
      <div class="cart-main-column w100">
        <section class="cart-main-panel">
          <template v-if="cartItems.length">
            <div class="cart-table-shell">
              <el-table
                ref="cartTableRef"
                :data="pagedItems"
                stripe
                border
                row-key="cartId"
                class="cart-el-table"
                table-layout="fixed"
                :default-sort="{ prop: '_sortLine', order: 'descending' }"
                :row-class-name="cartRowClassName"
                @sort-change="onSortChange"
              >
                <el-table-column
                  label="商品信息"
                  prop="_sortTitle"
                  sortable="custom"
                  :min-width="isMobile ? 188 : 276"
                  :fixed="isMobile ? undefined : 'left'"
                  class-name="cart-col-product"
                >
                  <template #default="{ row }">
                    <div class="row-product">
                      <el-image
                        :src="cartCoverSrc(row)"
                        :alt="row.title"
                        class="card-cover bgfff"
                        :class="{ 'card-cover--tas-thumb-test': isCartTasmaniaStyleTestCover(row) && !row.demoPersistent }"
                        :fit="cartCoverFit(row)"
                        :preview-src-list="[cartCoverSrc(row)]"
                        :preview-teleported="true"
                      />
                      <div class="product-info">
                        <span v-if="row.demoPersistent && row.stateLabel" class="demo-pin-chip">{{ row.stateLabel }}</span>
                        <h3 class="title-link" @click.stop="openItemLocation(row)">{{ row.title }}</h3>
                        <span v-if="row.enTitle" class="en-title">{{ row.enTitle }}</span>
                        <p v-if="row.desc" class="card-desc">{{ row.desc }}</p>
                        <div v-if="row.wineOrigin || row.wineVintage" class="card-wine-meta">
                          <span v-if="row.wineOrigin" class="wine-meta-line">产地：{{ row.wineOrigin }}</span>
                          <span v-if="row.wineVintage" class="wine-meta-line">年份：{{ row.wineVintage }}</span>
                        </div>
                        <div class="card-meta">{{ row.regionName }} / {{ row.subNavName }}</div>
                      </div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="单价（元）" prop="_sortPrice" sortable="custom" :min-width="isMobile ? 84 : 112" align="right">
                  <template #default="{ row }">¥ {{ formatMoney(row.price) }}</template>
                </el-table-column>

                <el-table-column label="数量" prop="_sortQty" sortable="custom" :width="isMobile ? 118 : 132" align="center">
                  <template #default="{ row }">
                    <div class="row-qty" @click.stop>
                      <el-input-number
                        :model-value="row.quantity"
                        :min="1"
                        :step="1"
                        size="small"
                        @update:model-value="(value) => cartStore.updateQuantity(row.cartId, value)"
                      />
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="小计（元）" prop="_sortLine" sortable="custom" :min-width="isMobile ? 96 : 112" align="right">
                  <template #default="{ row }">
                    ¥ {{ formatMoney((Number(row.price) || 0) * (Number(row.quantity) || 0)) }}
                  </template>
                </el-table-column>

                <el-table-column v-if="!isMobile" label="操作" width="92" fixed="right" align="center" class-name="cart-col-act">
                  <template #default="{ row }">
                    <el-button text type="danger" @click.stop="tryRemoveCartLine(row)">移除</el-button>
                  </template>
                </el-table-column>

                <el-table-column v-if="!isMobile" label="选择" width="76" fixed="right" align="center" class-name="cart-col-select">
                  <template #default="{ row }">
                    <el-checkbox
                      class="action-select"
                      :model-value="row.selected"
                      @change="(checked) => cartStore.setItemSelected(row.cartId, checked)"
                      @click.stop
                    />
                  </template>
                </el-table-column>

                <el-table-column v-else label="" width="64" align="center" class-name="cart-col-mobile-combo">
                  <template #header><span class="cart-mobile-combo-head">勾选</span></template>
                  <template #default="{ row }">
                    <div class="cart-mobile-act-stack" @click.stop>
                      <el-checkbox
                        class="action-select"
                        :model-value="row.selected"
                        @change="(checked) => cartStore.setItemSelected(row.cartId, checked)"
                      />
                      <el-button text type="danger" size="small" class="cart-mobile-remove-btn" @click.stop="tryRemoveCartLine(row)">
                        移除
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
          </div>

          <div class="pagination-wrapper" v-if="totalItems > pageSize">
            <el-pagination
              :current-page="currentPage"
              :page-size="pageSize"
              :total="totalItems"
              :small="isPhone"
              layout="prev, pager, next"
              background
              @current-change="handlePageChange"
            />
          </div>
        </template>
        <template v-else>
          <div class="cart-filter-empty">
            <p>购物车暂无商品。</p>
          </div>
        </template>
        </section>

        <div class="cart-main-select">
          <el-button text type="danger" class="clear-cart-btn" @click="cartStore.clearCart()">清空购物车</el-button>
          <div class="all-select-wrap">
            <span class="all-select-text">全选（{{ selectedQuantity }}）</span>
            <el-checkbox class="all-select" :model-value="isAllSelected" @change="handleSelectAllChange" />
          </div>
        </div>
      </div>

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
  </div>
</template>

<style scoped lang="scss">
.cart-page {
  width: 90%;
  max-width: 100%;
  margin: 40px auto 80px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-sizing: border-box;
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

  .cart-header-sub {
    margin-top: 10px !important;
    font-size: 13px !important;
    color: #1f2937 !important;
    font-weight: 500;
  }
}

.demo-pin-chip {
  display: inline-block;
  margin-bottom: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #0369a1;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 4px;
}
.cart-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 18px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.cart-main-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  gap: 0;
  box-sizing: border-box;
}

.cart-main-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  padding: 0;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.cart-filter-empty {
  padding: 36px 20px;
  text-align: center;
  color: #64748b;
  font-size: 14px;

  p {
    margin: 0 0 14px;
  }
}

.cart-table-shell {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0;
}

.cart-el-table {
  width: max(860px, 100%);
  --ol-table-header-bg: #f6e8ed;
  --ol-table-muted-bg: #fcf3f6;
  --ol-table-row-hover: #fff8fa;
}

.cart-el-table :deep(.el-table thead th.el-table__cell) {
  background-color: var(--ol-table-header-bg) !important;
  color: #3f1a24;
  font-weight: 600;
}

.cart-el-table :deep(.el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: var(--ol-table-muted-bg) !important;
}

.cart-el-table :deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: var(--ol-table-row-hover) !important;
}

.cart-el-table :deep(.el-table__fixed-right-patch),
.cart-el-table :deep(.el-table__fixed-patch) {
  background-color: var(--ol-table-header-bg) !important;
}

.cart-el-table :deep(tr.cart-row--demo-pinned td.el-table__cell) {
  background-color: #fafbfc !important;
}

.cart-el-table :deep(tr.cart-row--selected td.el-table__cell) {
  background-color: #fff1f5 !important;
}

.cart-el-table :deep(tr.cart-row--selected.cart-row--demo-pinned td.el-table__cell) {
  background-color: #fff1f5 !important;
}

.cart-el-table :deep(.cart-col-product .cell),
.cart-el-table :deep(.cart-col-act .cell),
.cart-el-table :deep(.cart-col-select .cell) {
  cursor: default;
}

.cart-el-table :deep(.cart-col-act .cell),
.cart-el-table :deep(.cart-col-select .cell) {
  display: flex;
  justify-content: center;
  align-items: center;
}

.cart-el-table :deep(.cart-col-act .el-button),
.cart-el-table :deep(.cart-col-select .el-checkbox) {
  margin: 0;
}

.cart-el-table :deep(.cart-col-product .title-link) {
  cursor: pointer;
}

.cart-el-table :deep(.cart-col-mobile-combo .cell) {
  vertical-align: middle;
  cursor: default;
}

.cart-mobile-combo-head {
  font-size: 12px;
  color: #3f1a24;
  font-weight: 600;
}

.cart-mobile-act-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 2px 0;
}

.cart-mobile-remove-btn {
  padding: 0 !important;
  font-size: 12px !important;
  line-height: 1.3 !important;
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

/* 【样式测试·可删】塔斯购物车封面：contain + 底色，与 ItemGrid --tas-thumb-test 一致 */
// .card-cover.card-cover--tas-thumb-test {
//   background: #f3f0ec;
// }

.card-cover.card-cover--tas-thumb-test :deep(img) {
  object-fit: contain;
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
  padding: 12px 0 0;
  margin: 0;
  border: none;
  background: transparent;
  box-shadow: none;
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

@media (max-width: 1024px) {
  .cart-table-shell {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }

  /*
   * 与订单列表一致：表格保持不小于列宽总和，外层 shell 横向滚动，
   * 避免 width:100%+min-width:0 把整表压在视口内导致「固定死在窄宽度」观感。
   */
  .cart-el-table {
    width: max(860px, 100%);
  }

  .row-qty :deep(.el-input-number) {
    width: 100%;
    max-width: 118px;
  }
}

@media (max-width: 768px) {
  .cart-page {
    width: 95%;
    margin-top: 28px;
    margin-bottom: 56px;
    gap: 18px;
  }

  .cart-content {
    grid-template-columns: 1fr;
  }

  .cart-header {
    padding: 14px 16px;
  }

  .cart-header h1 {
    font-size: 24px;
  }

  .cart-header p:first-of-type {
    font-size: 13px;
  }

  /* 与订单列表 od-card-like 一致：整块主栏为白底描边卡片，表格在内部横向滑动 */
  .cart-main-panel {
    background: #fff;
    border: 1px solid #e5e7eb;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  }

  .cart-table-shell {
    border: none;
    margin: 0;
    padding: 0;
    background: transparent;
  }

  .title-link {
    max-width: none;
  }

  .product-info h3 {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    -webkit-line-clamp: unset;
    line-clamp: unset;
    display: block;
    font-size: 15px;
  }

  .card-cover {
    width: 76px;
    height: 76px;
    min-width: 76px;
    min-height: 76px;
    flex: 0 0 76px;
  }

  .row-product {
    min-height: 96px;
    gap: 10px;
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
