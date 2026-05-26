<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { resolveDataImage } from '@/utils/dataImageResolver'
import { loadMockOrderDetail } from '@/utils/mockOrderStorage'
import { getStaticDemoOrderByNo } from '@/utils/demoStaticOrders'
/** 【样式测试·可删】与结算页塔斯缩略图一致；见 tasmaniaGridStyleTestThumbs.js */
import { tasGridStyleTestThumbByIndex } from '@/utils/tasmaniaGridStyleTestThumbs'
import { withRandomLoading } from '@/utils/loadingUtils'

const route = useRoute()
const router = useRouter()

const order = ref(null)
/** 支付成功当次跳入：去掉 URL 参数后不再出现，属「一次性」提示语义 */
const showFreshSnapshotBanner = ref(false)
/** 从「我的订单」列表进入本页后为 true（与结算后直接查看区分） */
const entryFromOrders = ref(false)

const syncEntrySourceFlags = () => {
  if (route.query.fresh === '1') {
    entryFromOrders.value = false
  } else if (route.query.from === 'orders') {
    entryFromOrders.value = true
  }
}

const loadFromRoute = () => {
  const no = typeof route.params.orderNo === 'string' ? route.params.orderNo.trim() : ''
  order.value = no ? (loadMockOrderDetail(no) ?? getStaticDemoOrderByNo(no)) : null
}

const consumeFreshQuery = async () => {
  if (route.query.fresh !== '1') return
  showFreshSnapshotBanner.value = true
  await nextTick()
  await router.replace({
    name: 'OrderDetail',
    params: route.params,
    /** 保留标记：用于布局隐藏全站顶栏/底栏及服务导航（支付成功后的快照页） */
    query: { snapshot: '1' }
  })
}

/** 剥离 from=orders，保留其它 query（一般不叠 fresh） */
const consumeOrdersEntryQuery = async () => {
  if (route.query.from !== 'orders') return
  await nextTick()
  const q = { ...route.query }
  delete q.from
  await router.replace({
    name: 'OrderDetail',
    params: route.params,
    query: q
  })
}

watch(
  () => [route.params.orderNo, route.query.fresh, route.query.from],
  async () => {
    syncEntrySourceFlags()
    loadFromRoute()
    await consumeFreshQuery()
    await consumeOrdersEntryQuery()
  },
  { immediate: true }
)

onMounted(() => {
  void withRandomLoading(undefined, { min: 0, max: 400 })
})

const hasOrder = computed(() => !!(order.value && order.value.orderNo))

/** 支付成功后 snapshot=1 页：顶栏底栏收起，本条用于整页内容横向居中排版 */
const isPaySnapshotLayout = computed(() => route.query.snapshot === '1')

const formattedPaidAt = computed(() => {
  const t = order.value?.paidAt
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return '—'
  try {
    return new Date(n).toLocaleString('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  } catch {
    return '—'
  }
})

const resolveImageUrl = (img) => resolveDataImage(img, undefined, { variant: 'thumb' })

const lineThumbSrc = (line) => {
  const img = typeof line?.img === 'string' && line.img.trim()
  if (img) return resolveImageUrl(line.img)
  if (line?.regionPath === 'tasmania') {
    return tasGridStyleTestThumbByIndex(Number(line.lineIndex) || 0)
  }
  return resolveImageUrl(line?.img)
}

const lineThumbFit = (line) => {
  const img = typeof line?.img === 'string' && line.img.trim()
  if (img) return 'cover'
  return line?.regionPath === 'tasmania' ? 'contain' : 'cover'
}

const lineNavMeta = (line) => {
  const parts = [line?.regionName, line?.subNavName].filter((s) => typeof s === 'string' && s.trim())
  return parts.length ? parts.join(' / ') : ''
}

const lineSubtotal = (line) => {
  const p = Number(line?.price)
  const q = Number(line?.quantity)
  const safeP = Number.isFinite(p) && p >= 0 ? p : 0
  const safeQ = Number.isFinite(q) && q >= 0 ? q : 0
  return safeP * safeQ
}

const goBackCart = () => router.push({ name: 'Cart' })

const goHome = () => router.push({ name: 'Home' })

const goOrderList = () => router.push({ name: 'OrderList' })

const formatMoney = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}
</script>

<template>
  <div class="order-detail-page" :class="{ 'order-detail-page--pay-snapshot': isPaySnapshotLayout }">
    <header class="order-detail-head">
      <div class="order-detail-head-inner">
        <div v-if="!entryFromOrders" class="od-top-actions">
          <el-button text class="back-link" @click="goOrderList">
            <el-icon>
              <ArrowLeft />
            </el-icon>
            返回订单列表
          </el-button>
          <el-button
            v-if="!isPaySnapshotLayout"
            text
            class="back-link back-link--minor"
            @click="goBackCart"
          >
            购物车
          </el-button>
        </div>
        <div class="order-detail-titles">
          <h1>订单详情</h1>
        <p v-if="hasOrder && order.demoFulfillmentKey">本单为<strong>内置状态演示</strong>数据，不写入本地会话，仅用于界面与进度展示。</p>
        <p v-else-if="hasOrder && entryFromOrders">来自「我的订单」：以下为当前浏览器内保存的支付快照，便于核对商品与收货信息。</p>
        <p v-else-if="hasOrder">本页展示模拟支付成功后保存的快照（仅存于当前浏览器会话）。</p>
        <p v-else>在结算页支付成功后可从结果页点击「查看订单」，或从我的订单列表进入。</p>
        </div>
      </div>
    </header>

    <div v-if="hasOrder" class="order-detail-body">
      <el-alert
        v-if="showFreshSnapshotBanner"
        class="od-fresh-banner"
        type="success"
        show-icon
        :closable="true"
        title="本次支付已成功"
        description="此为当次跳转的一次性确认条；快照仍可在「我的订单」中再次查看。"
        @close="showFreshSnapshotBanner = false"
      />
      <section class="od-card od-card--status">
        <span class="od-status-pill od-status-pill--paid">已支付</span>
        <div class="od-kv-grid">
          <div class="od-kv"><span>订单号</span><strong>{{ order.orderNo }}</strong></div>
          <div class="od-kv"><span>支付时间</span><strong>{{ formattedPaidAt }}</strong></div>
          <div class="od-kv"><span>支付方式</span><strong>{{ order.payMethodLabel || order.payMethod || '—' }}</strong>
          </div>
          <div class="od-kv od-kv--full" v-if="order.remark"><span>备注</span><strong>{{ order.remark }}</strong></div>
        </div>
      </section>

      <section class="od-card">
        <h2 class="od-card-title">收货信息</h2>
        <div class="od-contact">
          <p><span class="od-label">联系人</span>{{ order.contact?.contactName || '—' }}</p>
          <p><span class="od-label">电话</span>{{ order.contact?.phone || '—' }}</p>
          <p v-if="order.contact?.email"><span class="od-label">邮箱</span>{{ order.contact.email }}</p>
          <p><span class="od-label">地址</span>{{ order.contact?.address || '—' }}</p>
        </div>
      </section>

      <section class="od-card od-card--items">
        <h2 class="od-card-title">商品明细</h2>
        <ul class="od-line-list">
          <li v-for="(line, li) in order.items" :key="line.cartId || li" class="od-line">
            <!-- 【样式测试·可删】塔斯行缩略图；与 CheckoutView paying-thumb 同源逻辑 -->
            <el-image :src="lineThumbSrc(line)" :alt="line.title"
              :class="[
                'od-line-thumb',
                'bgfff',
                { 'od-line-thumb--tas': line.regionPath === 'tasmania' && !(typeof line.img === 'string' && line.img.trim()) }
              ]"
              :fit="lineThumbFit(line)" />
            <div class="od-line-info">
              <span class="od-line-title" :title="line.title">{{ line.title }}</span>
              <div v-if="line.wineOrigin || line.wineVintage" class="od-line-wine-meta">
                <span v-if="line.wineOrigin">产地：{{ line.wineOrigin }}</span>
                <span v-if="line.wineVintage">年份：{{ line.wineVintage }}</span>
              </div>
              <div v-if="lineNavMeta(line)" class="od-line-nav-meta">{{ lineNavMeta(line) }}</div>
              <div class="od-line-qty-price">
                <span>¥ {{ formatMoney(line.price) }} × {{ line.quantity }}</span>
                <strong>小计 ¥ {{ formatMoney(lineSubtotal(line)) }}</strong>
              </div>
            </div>
          </li>
        </ul>
        <div class="od-summary-bar">
          <span>共 <strong>{{ order.paidQuantity }}</strong> 件</span>
          <span class="od-total">实付 <strong>¥ {{ order.paidAmount }}</strong></span>
        </div>
      </section>

      <footer v-if="!entryFromOrders" class="od-footer-actions">
        <el-button @click="goOrderList">我的订单</el-button>
        <el-button @click="goHome">返回首页</el-button>
        <el-button type="primary" @click="goBackCart">继续购物</el-button>
      </footer>
      <footer v-else class="od-footer-actions od-footer-actions--from-list">
        <p class="od-footer-tip">以上为本地会话内的订单快照，可随时在「我的订单」中再次打开本单。</p>
        <div class="od-footer-btns">
          <el-button type="primary" @click="goOrderList">返回我的订单</el-button>
          <el-button @click="goHome">返回首页逛逛</el-button>
        </div>
      </footer>
    </div>

    <div v-else class="order-detail-empty od-card">
      <p>未找到该订单快照，可能已过期或订单号不正确。</p>
      <div class="od-empty-actions">
        <el-button @click="goOrderList">返回订单列表</el-button>
        <el-button type="primary" @click="goHome">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.order-detail-page {
  width: 90%;
  max-width: 100%;
  margin: 40px auto 80px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.order-detail-page--pay-snapshot {
  width: 100%;
  max-width: min(920px, 100%);
  margin-left: auto;
  margin-right: auto;
  align-self: center;
}

.order-detail-page--pay-snapshot .od-footer-actions {
  justify-content: center;
}

.order-detail-head-inner {
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 20px 24px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.od-top-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.od-fresh-banner {
  margin-bottom: 4px;
}

.back-link {
  padding: 0 0 10px;
  color: #64748b;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.back-link:hover {
  color: #a8163c;
}

.back-link--minor {
  color: #94a3b8;
}

.back-link--minor:hover {
  color: #a8163c;
}

.order-detail-titles h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.order-detail-titles p {
  margin: 8px 0 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

.od-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 18px 20px;
}

.od-card--status {
  position: relative;
}

.od-status-pill {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 14px;
}

.od-status-pill--paid {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.od-kv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
}

.od-kv {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.od-kv.od-kv--full {
  grid-column: 1 / -1;
}

.od-kv span {
  font-size: 13px;
  color: #64748b;
}

.od-kv strong {
  font-size: 15px;
  color: #0f172a;
  word-break: break-all;
}

.od-card-title {
  margin: 0 0 12px;
  font-size: 17px;
  color: #1f2937;
  font-weight: 600;
}

.od-contact {
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
}

.od-contact p {
  margin: 0;
}

.od-label {
  display: inline-block;
  min-width: 4.5em;
  color: #64748b;
  margin-right: 8px;
}

.od-line-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.od-line {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 0;
  border-bottom: 1px solid #f1f5f9;
}

.od-line:last-child {
  border-bottom: none;
}

.od-line-thumb {
  width: 64px;
  height: 64px;
  border-radius: 4px;
  display: block;
}

.od-line-thumb.od-line-thumb--tas {
  background: #f3f0ec;
}

.od-line-thumb.od-line-thumb--tas :deep(img) {
  object-fit: contain;
}

.od-line-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.od-line-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.od-line-wine-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13px;
  color: #64748b;
}

.od-line-nav-meta {
  font-size: 13px;
  color: #8f1239;
  line-height: 1.4;
}

.od-line-qty-price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.od-line-qty-price strong {
  color: #b6193e;
  font-size: 15px;
}

.od-summary-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eef2f7;
  font-size: 14px;
  color: #475569;
}

.od-total strong {
  font-size: 20px;
  color: #b6193e;
  margin-left: 6px;
}

.od-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 18px;
}

.od-footer-actions--from-list {
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 12px;
  padding: 16px 0 8px;
  border-top: 1px dashed #e2e8f0;
  margin-top: 20px;
}

.od-footer-tip {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.55;
  width: 100%;
  text-align: left;
  align-self: stretch;
}

.od-footer-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  width: 100%;
}

@media (max-width: 768px) {
  .order-detail-page {
    width: 95%;
    margin-top: 28px;
    margin-bottom: 56px;
  }

  .order-detail-page--pay-snapshot {
    width: 100%;
    max-width: 100%;
  }

  .od-footer-actions--from-list .od-footer-btns {
    justify-content: flex-end;
  }

  .od-footer-actions--from-list .od-footer-btns .el-button {
    flex: 0 1 auto;
    min-width: 120px;
  }
}

.order-detail-empty {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.od-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.order-detail-empty p {
  margin: 0 0 16px;
}

@media (max-width: 640px) {
  .od-kv-grid {
    grid-template-columns: 1fr;
  }

  .od-line {
    grid-template-columns: 52px 1fr;
  }

  .od-line-thumb {
    width: 52px;
    height: 52px;
  }
}
</style>
