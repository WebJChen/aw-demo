<script setup>
import { computed, nextTick, onActivated, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { MoreFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '@/stores/deviceStore'
import { listMockOrders, removeMockOrder } from '@/utils/mockOrderStorage'
import { STATIC_DEMO_ORDERS, isStaticDemoOrderNo } from '@/utils/demoStaticOrders'
import { resolveDataImage } from '@/utils/dataImageResolver'
/** 【样式测试·可删】塔斯缩略图 */
import { tasGridStyleTestThumbByIndex } from '@/utils/tasmaniaGridStyleTestThumbs'
import { useDialogStore } from '@/stores/dialogStore'
import {
  getDemoFulfillmentForOrder,
  buildOrderListActions,
  fulfillmentVariantForPhaseKey,
  ORDER_PROGRESS_FILTER_OPTIONS
} from '@/utils/orderFulfillmentDemo'

const router = useRouter()
const dialogStore = useDialogStore()
const deviceStore = useDeviceStore()
const { isMobile } = storeToRefs(deviceStore)
const orders = ref([])

const tableRef = ref(null)

const filterProgress = ref('all')

/** 列表内排序字段（配合 el-table 列 prop） */
const numericPaidTime = (row) => {
  const n = Number(row?.paidAt || row?.savedAt)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const refresh = () => {
  const sessionRows = listMockOrders().filter((r) => !String(r?.orderNo || '').startsWith('DEMO-'))
  const merged = [...STATIC_DEMO_ORDERS, ...sessionRows]
  orders.value = merged.map((row, index) => {
    const { key, label } = getDemoFulfillmentForOrder(row, index)
    return {
      ...row,
      _fulfillmentKey: key,
      _fulfillmentLabel: label,
      _sortTime: numericPaidTime(row),
      _sortAmount: Number.isFinite(Number(row?.paidAmount)) ? Number(row.paidAmount) : 0,
      _sortQty: Number.isFinite(Number(row?.paidQuantity)) ? Number(row.paidQuantity) : 0
    }
  })
}

/** 筛选后的数据交由 el-table 默认排序箭头排序 */
const filteredOrders = computed(() => {
  if (filterProgress.value === 'all') return orders.value
  return orders.value.filter((r) => r._fulfillmentKey === filterProgress.value)
})

onMounted(() => {
  deviceStore.startListen()
  refresh()
})
onActivated(refresh)

onUnmounted(() => {
  deviceStore.stopListen()
})

const formatDt = (t) => {
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return '—'
  try {
    return new Date(n).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

const resolveImageUrl = (img) => resolveDataImage(img, undefined, { variant: 'thumb' })

const firstLineThumbSrc = (row) => {
  const first = row?.items?.[0]
  if (!first) return ''
  const img = typeof first.img === 'string' && first.img.trim()
  if (img) return resolveImageUrl(first.img)
  if (first.regionPath === 'tasmania') {
    return tasGridStyleTestThumbByIndex(Number(first.lineIndex) || 0)
  }
  return resolveImageUrl(first.img)
}

const firstLineThumbFit = (row) => {
  const first = row?.items?.[0]
  const img = typeof first?.img === 'string' && first.img.trim()
  if (img) return 'cover'
  return first?.regionPath === 'tasmania' ? 'contain' : 'cover'
}

const orderWineSnippets = (row) => {
  const items = Array.isArray(row?.items) ? row.items : []
  const out = []
  const cap = Math.min(items.length, 2)
  for (let i = 0; i < cap; i++) {
    const it = items[i]
    const title = typeof it?.title === 'string' ? it.title.trim() : ''
    if (!title) continue
    const metaParts = [
      it.wineOrigin && `产地：${it.wineOrigin}`,
      it.wineVintage && `年份：${it.wineVintage}`,
      [it.regionName, it.subNavName].filter(Boolean).join(' / ')
    ].filter(Boolean)
    out.push({
      title,
      meta: metaParts.join(' · '),
      extraQty: typeof it.quantity === 'number' || typeof it.quantity === 'string' ? `×${it.quantity}` : ''
    })
  }
  if (items.length > 2) {
    out.push({ title: `… 共 ${items.length} 款酒`, meta: '', extraQty: '', isOverflow: true })
  }
  return out
}

const fulfillForRow = (row) => ({ key: row._fulfillmentKey, label: row._fulfillmentLabel })

const actionsForRow = (row) => buildOrderListActions(row._fulfillmentKey)

const fulfillVariant = (row) => fulfillmentVariantForPhaseKey(row._fulfillmentKey)

const actionHint = (kind) => {
  const hints = {
    appeal: '订单申诉为演示入口。',
    afterSale: '售后为演示入口。',
    review: '评价为演示入口。'
  }
  return hints[kind] || '功能即将上线'
}

const onDemoAction = (kind, _row) => {
  if (kind === 'logistics') {
    dialogStore.openDialog('comingSoon')
    return
  }
  ElMessage.info(actionHint(kind))
}

const goDetail = (orderNo) => {
  router.push({
    name: 'OrderDetail',
    params: { orderNo },
    query: { from: 'orders' }
  })
}

const formatMoney = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

const deleteDialogVisible = ref(false)
const deleteStep = ref(1)
const deleteTarget = ref(null)

const closeDeleteDialog = () => {
  deleteDialogVisible.value = false
}

const onDeleteDialogClosed = () => {
  deleteStep.value = 1
  deleteTarget.value = null
}

/** 会话快照订单删除：两步 el-dialog（不再使用 MessageBox） */
const handleDeleteClick = (row, ev) => {
  ev?.stopPropagation?.()
  const no = typeof row?.orderNo === 'string' ? row.orderNo.trim() : ''
  if (!no) return
  if (isStaticDemoOrderNo(no)) {
    ElMessage.warning('内置状态演示订单不可删除')
    return
  }
  deleteTarget.value = row
  deleteStep.value = 1
  deleteDialogVisible.value = true
}

const confirmDeleteStep1 = () => {
  deleteStep.value = 2
}

const confirmDeleteFinal = () => {
  const no = typeof deleteTarget.value?.orderNo === 'string' ? deleteTarget.value.orderNo.trim() : ''
  if (!no) {
    closeDeleteDialog()
    return
  }
  const ok = removeMockOrder(no)
  if (ok) {
    ElMessage.success('订单已删除')
  } else {
    ElMessage.error('删除失败：未找到该订单或存储异常')
  }
  closeDeleteDialog()
  refresh()
}

const resetListFilters = () => {
  filterProgress.value = 'all'
  nextTick(() => {
    tableRef.value?.clearSort?.()
    tableRef.value?.sort?.('_sortTime', 'descending')
  })
}

/** 移动端：操作收成「⋯」菜单，避免遮挡酒款概要 */
const onOrderMobileMenuCommand = (cmd, row) => {
  if (!row) return
  if (cmd === 'detail') {
    goDetail(row.orderNo)
    return
  }
  if (cmd === 'delete') {
    handleDeleteClick(row)
    return
  }
  if (typeof cmd === 'string' && cmd.startsWith('demo|')) {
    onDemoAction(cmd.slice('demo|'.length), row)
  }
}
</script>

<template>
  <div class="order-list-page w100">
    <header class="ol-head">
      <h1>我的订单</h1>
      <p>
        顶部为内置<strong>状态演示</strong>订单（不写会话存储）；其下为当前浏览器内模拟支付成功后保存的快照。
      </p>
    </header>

    <template v-if="orders.length">
      <div class="ol-toolbar od-card-like w100">
        <div class="ol-toolbar-inner">
          <span class="ol-toolbar-title">筛选</span>
          <div class="ol-toolbar-fields">
            <el-select v-model="filterProgress" placeholder="履约进度" class="ol-toolbar-select">
              <el-option
                v-for="opt in ORDER_PROGRESS_FILTER_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
        </div>
      </div>

      <div v-if="!filteredOrders.length" class="ol-filter-empty od-card-like w100">
        <p>暂无符合筛选条件的订单。</p>
        <el-button type="primary" plain @click="resetListFilters">重置筛选条件</el-button>
      </div>

      <div v-else class="ol-table-shell od-card-like w100">
        <el-table
          ref="tableRef"
          :data="filteredOrders"
          stripe
          border
          class="ol-el-table"
          row-key="orderNo"
          table-layout="fixed"
          :default-sort="{ prop: '_sortTime', order: 'descending' }"
          highlight-current-row
          @row-click="(row) => goDetail(row.orderNo)"
        >
          <el-table-column
            label="酒款概要 / 订单号"
            prop="orderNo"
            min-width="248"
            :fixed="isMobile ? undefined : 'left'"
            class-name="ol-col-product"
          >
            <template #default="{ row }">
              <div class="ol-product-inner w100 ol-product-inner--cell">
                <el-image
                  v-if="firstLineThumbSrc(row)"
                  :src="firstLineThumbSrc(row)"
                  :class="[
                    'ol-snippet-thumb',
                    'bgfff',
                    {
                      'ol-snippet-thumb--tas':
                        row.items?.[0]?.regionPath === 'tasmania' &&
                        !(typeof row.items?.[0]?.img === 'string' && row.items[0].img.trim())
                    }
                  ]"
                  :fit="firstLineThumbFit(row)"
                />
                <div class="ol-product-text w100">
                  <template v-for="(snip, si) in orderWineSnippets(row)" :key="si">
                    <div class="ol-wine-snippet" :class="{ 'ol-wine-snippet--muted': snip.isOverflow }">
                      <span class="ol-snippet-title">{{ snip.title }}</span>
                      <span v-if="snip.meta" class="ol-snippet-meta">{{ snip.meta }}</span>
                      <span v-if="snip.extraQty" class="ol-snippet-qty">{{ snip.extraQty }}</span>
                    </div>
                  </template>
                  <div class="ol-order-no-muted">订单号 {{ row.orderNo }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            label="支付时间"
            prop="_sortTime"
            sortable
            min-width="158"
          >
            <template #default="{ row }">{{ formatDt(row.paidAt || row.savedAt) }}</template>
          </el-table-column>

          <el-table-column label="件数" prop="_sortQty" sortable width="92" align="center">
            <template #default="{ row }">{{ row.paidQuantity }} 件</template>
          </el-table-column>

          <el-table-column label="实付（元）" prop="_sortAmount" sortable min-width="112" align="right">
            <template #default="{ row }">¥ {{ formatMoney(row.paidAmount) }}</template>
          </el-table-column>

          <el-table-column label="当前进度" min-width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="fulfillVariant(row)" effect="light" size="small" class="ol-status-tag">
                {{ fulfillForRow(row).label }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            align="center"
            class-name="ol-col-act"
            :width="isMobile ? 54 : undefined"
            :min-width="isMobile ? 54 : 200"
            fixed="right"
          >
            <template #default="{ row }">
              <div class="ol-act-wrap" @click.stop>
                <div v-if="!isMobile" class="ol-act-inner">
                  <el-button type="primary" link class="ol-act-btn" @click="goDetail(row.orderNo)">查看详情</el-button>
                  <el-button
                    v-for="a in actionsForRow(row)"
                    :key="a.kind + a.label"
                    link
                    class="ol-act-btn"
                    @click="onDemoAction(a.kind, row)"
                  >
                    {{ a.label }}
                  </el-button>
                  <el-button
                    v-if="!isStaticDemoOrderNo(row.orderNo)"
                    type="danger"
                    link
                    class="ol-act-btn ol-act-btn--delete"
                    @click="handleDeleteClick(row, $event)"
                  >
                    删除订单
                  </el-button>
                </div>
                <el-dropdown
                  v-else
                  class="ol-act-more-dd"
                  trigger="click"
                  teleported
                  popper-class="ol-order-act-popper"
                  @command="(c) => onOrderMobileMenuCommand(c, row)"
                >
                  <el-button aria-label="更多操作" circle text type="primary" class="ol-act-more-trigger">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="detail">查看详情</el-dropdown-item>
                      <el-dropdown-item
                        v-for="a in actionsForRow(row)"
                        :key="'m-' + a.kind + a.label"
                        :command="'demo|' + a.kind"
                      >
                        {{ a.label }}
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="!isStaticDemoOrderNo(row.orderNo)"
                        command="delete"
                        divided
                        class="danger-delete"
                      >
                        删除订单
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <div v-else class="ol-empty od-card-like w100">
      <p>暂无订单。支付成功后会出现在此列表。</p>
      <el-button type="primary" @click="router.push({ name: 'Cart' })">去购物车</el-button>
    </div>

    <el-dialog
      v-model="deleteDialogVisible"
      destroy-on-close
      width="480px"
      align-center
      class="ol-delete-dialog"
      :title="deleteStep === 1 ? '删除订单' : '再次确认删除'"
      @closed="onDeleteDialogClosed"
    >
      <template v-if="deleteStep === 1">
        <el-alert type="warning" show-icon :closable="false" title="此操作将影响本地快照" />
        <p class="ol-delete-msg">
          订单号：<strong>{{ deleteTarget?.orderNo }}</strong>
        </p>
        <p class="ol-delete-desc">
          确定要删除该订单吗？删除后无法在<strong>当前浏览器会话</strong>内恢复本条快照。<br />
          （第一步确认，共两步）
        </p>
      </template>
      <template v-else>
        <el-alert type="error" show-icon :closable="false" title="不可撤销" />
        <p class="ol-delete-msg">
          将永久移除订单「<strong>{{ deleteTarget?.orderNo }}</strong>」的本地会话快照。
        </p>
      </template>
      <template #footer>
        <div class="ol-delete-footer">
          <el-button @click="closeDeleteDialog">取消</el-button>
          <template v-if="deleteStep === 1">
            <el-button type="warning" @click="confirmDeleteStep1">继续</el-button>
          </template>
          <el-button v-else type="danger" @click="confirmDeleteFinal">确认删除</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.order-list-page {
  width: 90%;
  max-width: 100%;
  margin: 40px auto 80px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-sizing: border-box;
}

.ol-head {
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.ol-head h1 {
  margin: 0;
  font-size: 28px;
  color: #1f2937;
  font-weight: 700;
}

.ol-head p {
  margin: 8px 0 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

.od-card-like {
  background: #fff;
  border: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.ol-toolbar {
  padding: 16px 18px;
}

.ol-toolbar-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}

.ol-toolbar-title {
  font-weight: 600;
  font-size: 14px;
  color: #334155;
}

.ol-toolbar-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  flex: 1;
  justify-content: flex-end;
}

.ol-toolbar-select {
  width: min(100%, 200px);
  min-width: 140px;
}

.ol-filter-empty {
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
}

.ol-filter-empty p {
  margin: 0 0 14px;
}

.ol-table-shell {
  padding: 0;
  overflow: auto hidden;
}

.ol-el-table {
  width: max(920px, 100%);
  /* 替换默认 #f5f7fa 系冷灰，改为主题酒红偏粉的浅底 */
  --ol-table-header-bg: #f6e8ed;
  --ol-table-muted-bg: #fcf3f6;
  --ol-table-row-hover: #fff8fa;
  --ol-table-row-current: #fff1f5;
}

.ol-el-table :deep(.el-table thead th.el-table__cell) {
  background-color: var(--ol-table-header-bg) !important;
  color: #3f1a24;
  font-weight: 600;
}

.ol-el-table :deep(.el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: var(--ol-table-muted-bg) !important;
}

.ol-el-table :deep(.el-table__body tr.hover-row > td.el-table__cell) {
  background-color: var(--ol-table-row-hover) !important;
}

.ol-el-table :deep(.el-table__body tr.current-row > td.el-table__cell) {
  background-color: var(--ol-table-row-current) !important;
}

/* 固定列表头/补丁区与主体一致，避免露灰边 */
.ol-el-table :deep(.el-table__fixed-right-patch),
.ol-el-table :deep(.el-table__fixed-patch) {
  background-color: var(--ol-table-header-bg) !important;
}

.ol-el-table :deep(.el-table__body tr.el-table__row--striped.hover-row > td.el-table__cell) {
  background-color: #fff4f7 !important;
}

.ol-el-table :deep(.el-table__body tr) {
  cursor: pointer;
}

.ol-el-table :deep(.ol-col-act .cell) {
  cursor: default;
}

.ol-product-inner {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.ol-product-inner--cell {
  padding: 4px 0;
}

.ol-snippet-thumb {
  width: 52px;
  height: 52px;
  min-width: 52px;
  flex-shrink: 0;
  border-radius: 4px;
}

.ol-snippet-thumb :deep(img) {
  object-fit: cover;
}

.ol-snippet-thumb.ol-snippet-thumb--tas {
  background: #f3f0ec;
}

.ol-snippet-thumb.ol-snippet-thumb--tas :deep(img) {
  object-fit: contain;
}

.ol-product-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ol-wine-snippet {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ol-wine-snippet--muted {
  opacity: 0.85;
}

.ol-snippet-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.35;
}

.ol-snippet-meta {
  font-size: 13px;
  color: #64748b;
  line-height: 1.35;
  word-break: break-word;
}

.ol-snippet-qty {
  font-size: 12px;
  color: #475569;
}

.ol-order-no-muted {
  font-size: 12px;
  color: #94a3b8;
  word-break: break-all;
  margin-top: 2px;
}

.ol-status-tag {
  max-width: 100%;
  font-weight: 600;
}

.ol-act-inner {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  justify-content: center;
  align-items: center;
}

.ol-act-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 36px;
}

.ol-act-more-trigger {
  padding: 8px !important;
  font-size: 18px;
}

.ol-act-more-dd {
  line-height: 1;
}

.ol-act-btn {
  margin: 0 !important;
  padding: 0 4px !important;
  font-size: 13px;
}

.ol-empty {
  padding: 48px 20px;
  text-align: center;
  color: #64748b;
}

.ol-empty p {
  margin: 0 0 14px;
}

.ol-delete-msg {
  margin: 16px 0 8px;
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
}

.ol-delete-desc {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
}

.ol-delete-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

@media (min-width: 1025px) {
  .order-list-page {
    width: 86%;
    margin-top: 32px;
    margin-bottom: 72px;
    gap: 18px;
  }

  .ol-head {
    padding: 16px 20px;

    h1 {
      font-size: 24px;
    }

    p {
      font-size: 13px;
    }
  }

  .ol-toolbar {
    padding: 12px 16px;
  }

  .ol-toolbar-inner {
    gap: 10px 16px;
  }

  .ol-toolbar-title {
    font-size: 13px;
  }

  .ol-toolbar-select {
    width: min(100%, 188px);
    min-width: 136px;
  }

  .ol-table-shell {
    padding: 0;
  }

  .ol-el-table {
    width: max(900px, 100%);
  }

  .ol-product-inner {
    gap: 10px;
  }

  .ol-snippet-thumb {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .ol-snippet-title {
    font-size: 13px;
  }

  .ol-snippet-meta {
    font-size: 12px;
  }

  .ol-snippet-qty,
  .ol-order-no-muted {
    font-size: 11px;
  }

  .ol-act-wrap {
    min-height: 32px;
  }

  .ol-act-btn {
    font-size: 12px;
  }

  .ol-empty {
    padding: 36px 20px;
  }
}

@media (max-width: 1024px) {
  .ol-table-shell {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .ol-el-table {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 768px) {
  .order-list-page {
    width: 95%;
    margin-top: 28px;
    margin-bottom: 56px;
    gap: 18px;
  }

  .ol-el-table {
    width: 100%;
  }

  .ol-head {
    padding: 14px 16px;
  }

  .ol-head h1 {
    font-size: 24px;
  }

  .ol-el-table :deep(.ol-col-act .cell) {
    padding: 4px 2px !important;
  }

  .ol-toolbar-inner {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .ol-toolbar-fields {
    width: 100%;
    justify-content: stretch;
  }

  .ol-toolbar-select {
    width: 100% !important;
    max-width: none;
    min-width: 0;
  }

  .ol-act-btn {
    min-height: 36px;
    padding: 0 6px !important;
  }

  .ol-status-tag {
    font-size: 12px;
  }
}
</style>

<style lang="scss">
/* 下拉挂在 body，需非 scoped */
.ol-order-act-popper.el-dropdown__popper .danger-delete.el-dropdown-menu__item {
  color: #cf1322 !important;
}
</style>
