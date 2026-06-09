<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, InfoFilled, Location, Phone, Clock, Link as LinkIcon } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '@/stores/deviceStore'
import { buildWineGridRoute } from '@/utils/wineGridRoute'
import { resolveDataImage } from '@/utils/dataImageResolver'
import { saveSearchTarget } from '@/utils/searchUtils'
import {
  buildWineryDetailPageModel,
  buildWineryListRouteTarget,
  buildWineHitKey,
  getClassicWineGridClass,
  loadClassicWinesForWinery,
  loadWineryDetailContext,
  resolveWineryDetailImages
} from '@/utils/wineryDetailPage'

const GRID_PRICE_COLOR = '#a8163c'

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()
const { isPhone, isPortrait, isTablet, isPc } = storeToRefs(deviceStore)

const loading = ref(true)
const loadError = ref('')
const detailCtx = ref(null)
const pageModel = ref(null)
const bannerImages = ref([])
const classicWines = ref([])
const sourceDialogVisible = ref(false)
const bannerCarouselRef = ref(null)

const regionPath = computed(() => (typeof route.params.regionPath === 'string' ? route.params.regionPath : ''))
const subNavPath = computed(() => (typeof route.params.subNav === 'string' ? route.params.subNav : ''))
const itemIndex = computed(() => (typeof route.params.itemIndex === 'string' ? route.params.itemIndex : ''))

const classicWineGridClass = computed(() =>
  getClassicWineGridClass({
    isPhone: isPhone.value,
    isPortrait: isPortrait.value,
    isTablet: isTablet.value,
    isPc: isPc.value
  })
)

const heroHeight = computed(() => {
  if (isPhone.value) return 240
  if (isTablet.value) return 320
  return 420
})

const resolveWineThumb = (item) =>
  resolveDataImage(item?.img, undefined, { variant: 'thumb' }) || resolveDataImage(item?.img) || ''

const formatRating = (display) => {
  const n = Number(display?.ratingStars)
  return Number.isFinite(n) ? n.toFixed(1) : ''
}

const splitPriceParts = (num, currency = '¥') => {
  const n = Number(num)
  const safe = Number.isFinite(n) && n >= 0 ? n : 0
  const s = Math.abs(safe).toFixed(2)
  const [intPart, dec] = s.split('.')
  return { intPart, fraction: dec !== '00' ? dec : null, currency }
}

const syncDetail = async () => {
  loading.value = true
  loadError.value = ''
  detailCtx.value = null
  pageModel.value = null
  bannerImages.value = []
  classicWines.value = []

  const ctx = await loadWineryDetailContext(regionPath.value, subNavPath.value, itemIndex.value)
  if (!ctx) {
    loadError.value = '未找到该酒庄，可能链接已失效或数据尚未加载。'
    loading.value = false
    return
  }

  detailCtx.value = ctx
  pageModel.value = buildWineryDetailPageModel(ctx)
  bannerImages.value = resolveWineryDetailImages(ctx.item)
  classicWines.value = await loadClassicWinesForWinery(ctx, 0)
  loading.value = false
}

const goBackToWineryList = () => {
  if (!regionPath.value || !subNavPath.value) return
  router.push(buildWineryListRouteTarget(regionPath.value, subNavPath.value))
}

const openWineGrid = () => {
  const href = router.resolve(buildWineGridRoute()).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

const openClassicWineWithFocus = (wineRow) => {
  const rp = wineRow?.regionPath || regionPath.value
  const subNav = wineRow?.subNavPath || 'red-wine'
  const sourceIdx = wineRow?.sourceItemIndex
  if (!rp || !subNav || sourceIdx == null) {
    openWineGrid()
    return
  }

  const hitKey = wineRow?.hitKey || buildWineHitKey(rp, subNav, sourceIdx, wineRow?.data)
  saveSearchTarget({
    hit: hitKey,
    sourceType: 'wine',
    pending: true,
    regionPath: rp,
    subNavPath: subNav,
    ts: Date.now()
  })

  const href = router.resolve({
    ...buildWineGridRoute({ subNavPath: subNav }),
    query: { hit: hitKey }
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

const featureIcon = (title) => {
  const t = String(title || '')
  if (/地址|位置|address/i.test(t)) return Location
  if (/电话|联系|phone|tel/i.test(t)) return Phone
  if (/营业|开放|时间|hour/i.test(t)) return Clock
  if (/网站|官网|website|link/i.test(t)) return LinkIcon
  return Location
}

watch([regionPath, subNavPath, itemIndex], () => {
  void syncDetail()
})

onMounted(() => {
  deviceStore.startListen()
  void syncDetail()
})

onUnmounted(() => {
  deviceStore.stopListen()
})
</script>

<template>
  <div class="winery-detail-page">
    <div v-if="loading" class="winery-detail-state">正在加载酒庄介绍…</div>

    <div v-else-if="loadError" class="winery-detail-state winery-detail-state--error">
      <p>{{ loadError }}</p>
      <el-button type="primary" plain @click="goBackToWineryList">返回酒庄列表</el-button>
    </div>

    <template v-else-if="pageModel">
      <div class="winery-detail-shell">
        <nav class="winery-detail-toolbar">
          <button type="button" class="winery-detail-back" @click="goBackToWineryList">
            <el-icon>
              <ArrowLeft />
            </el-icon>
            返回 {{ pageModel.regionNavName }}酒庄列表
          </button>
          <button type="button" class="winery-detail-wine-link" @click="openWineGrid">浏览本州酒款</button>
        </nav>

        <header class="winery-detail-hero">
          <div v-if="bannerImages.length" class="winery-detail-banner" :style="{ height: `${heroHeight}px` }">
            <el-carousel ref="bannerCarouselRef" :interval="0" indicator-position="inside" arrow="hover"
              :height="`${heroHeight}px`">
              <el-carousel-item v-for="(image, index) in bannerImages" :key="index">
                <img :src="image" :alt="pageModel.title" class="winery-detail-banner-img">
              </el-carousel-item>
            </el-carousel>
          </div>
          <div v-else class="winery-detail-banner winery-detail-banner--placeholder"
            :style="{ height: `${heroHeight}px` }">
            <span>{{ pageModel.title }}</span>
          </div>

          <div class="winery-detail-hero-copy">
            <p class="winery-detail-kicker">{{ pageModel.regionNavName }} · 首府 {{ pageModel.capital }}</p>
            <h1 class="winery-detail-title">
              {{ pageModel.title }}酒庄专页
              <span v-if="pageModel.enTitle" class="winery-detail-title-en">（{{ pageModel.enTitle }}）</span>
            </h1>
            <div class="winery-detail-chip-row">
              <span class="winery-detail-chip winery-detail-chip--type">{{ pageModel.wineryType }}</span>
              <span class="winery-detail-chip winery-detail-chip--visit">{{ pageModel.visitLabel }}</span>
              <span class="winery-detail-chip">{{ pageModel.regionLabel }}</span>
              <span class="winery-detail-chip">{{ pageModel.townLabel }}</span>
              <span v-for="tag in pageModel.styleTags" :key="tag" class="winery-detail-chip winery-detail-chip--tag">{{
                tag }}</span>
            </div>
          </div>
        </header>

        <div class="winery-detail-divider" aria-hidden="true">
          <span class="winery-detail-divider-line" />
          <span class="winery-detail-divider-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3h8l-1 9a4 4 0 0 1-8 0L8 3z" stroke="currentColor" stroke-width="1.5"
                stroke-linejoin="round" />
              <path d="M12 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          <span class="winery-detail-divider-line" />
        </div>

        <section class="winery-detail-section">
          <h2 class="winery-detail-section-title">相关介绍</h2>
          <p class="winery-detail-intro">{{ pageModel.intro }}</p>
          <div v-if="pageModel.tags.length" class="winery-detail-tag-row">
            <span v-for="(tag, tagIdx) in pageModel.tags" :key="tag" class="winery-detail-tag"
              :class="`winery-detail-tag--${(tagIdx % 2) + 1}`">{{ tag }}</span>
          </div>
        </section>

        <template v-if="pageModel.terroir.hasContent">
          <div class="winery-detail-divider" aria-hidden="true">
            <span class="winery-detail-divider-line" />
            <span class="winery-detail-divider-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3h8l-1 9a4 4 0 0 1-8 0L8 3z" stroke="currentColor" stroke-width="1.5"
                  stroke-linejoin="round" />
                <path d="M12 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </span>
            <span class="winery-detail-divider-line" />
          </div>

          <section class="winery-detail-section">
            <h2 class="winery-detail-section-title">风土与葡萄园</h2>
            <p v-if="pageModel.terroir.summary" class="winery-detail-intro">{{ pageModel.terroir.summary }}</p>
            <dl v-if="pageModel.terroir.rows.length" class="winery-detail-spec-grid">
              <div v-for="(row, index) in pageModel.terroir.rows" :key="`${row.label}-${index}`"
                class="winery-detail-spec-row">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            </dl>
          </section>
        </template>

        <template v-if="pageModel.story.hasContent">
          <div class="winery-detail-divider" aria-hidden="true">
            <span class="winery-detail-divider-line" />
            <span class="winery-detail-divider-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3h8l-1 9a4 4 0 0 1-8 0L8 3z" stroke="currentColor" stroke-width="1.5"
                  stroke-linejoin="round" />
                <path d="M12 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </span>
            <span class="winery-detail-divider-line" />
          </div>

          <section class="winery-detail-section">
            <h2 class="winery-detail-section-title">酒庄故事与历史</h2>
            <p v-if="pageModel.story.summary" class="winery-detail-intro">{{ pageModel.story.summary }}</p>
            <ol v-if="pageModel.story.timeline.length" class="winery-detail-timeline">
              <li v-for="(item, index) in pageModel.story.timeline" :key="`${item.year}-${index}`"
                class="winery-detail-timeline-item">
                <span v-if="item.year" class="winery-detail-timeline-year">{{ item.year }}</span>
                <div class="winery-detail-timeline-body">
                  <h3 v-if="item.title">{{ item.title }}</h3>
                  <p v-if="item.desc">{{ item.desc }}</p>
                </div>
              </li>
            </ol>
          </section>
        </template>

        <template v-if="pageModel.awards.hasContent">
          <div class="winery-detail-divider" aria-hidden="true">
            <span class="winery-detail-divider-line" />
            <span class="winery-detail-divider-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3h8l-1 9a4 4 0 0 1-8 0L8 3z" stroke="currentColor" stroke-width="1.5"
                  stroke-linejoin="round" />
                <path d="M12 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </span>
            <span class="winery-detail-divider-line" />
          </div>

          <section class="winery-detail-section">
            <h2 class="winery-detail-section-title">荣誉与认证</h2>
            <ul class="winery-detail-awards">
              <li v-for="(award, index) in pageModel.awards.items" :key="`${award.title}-${index}`"
                class="winery-detail-award-item">
                <span class="winery-detail-award-badge" aria-hidden="true">★</span>
                <div class="winery-detail-award-copy">
                  <strong>{{ award.title }}</strong>
                  <span v-if="award.year || award.issuer" class="winery-detail-award-meta">
                    <template v-if="award.year">{{ award.year }}</template>
                    <template v-if="award.year && award.issuer"> · </template>
                    <template v-if="award.issuer">{{ award.issuer }}</template>
                  </span>
                </div>
              </li>
            </ul>
          </section>
        </template>

        <div v-if="pageModel.features.length" class="winery-detail-divider" aria-hidden="true">
          <span class="winery-detail-divider-line" />
          <span class="winery-detail-divider-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3h8l-1 9a4 4 0 0 1-8 0L8 3z" stroke="currentColor" stroke-width="1.5"
                stroke-linejoin="round" />
              <path d="M12 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          <span class="winery-detail-divider-line" />
        </div>

        <section v-if="pageModel.features.length" class="winery-detail-section">
          <h2 class="winery-detail-section-title">联系信息</h2>
          <div class="winery-detail-feature-grid">
            <article v-for="(feature, index) in pageModel.features" :key="index" class="winery-detail-feature-card">
              <div class="winery-detail-feature-icon">
                <el-icon>
                  <component :is="featureIcon(feature.title)" />
                </el-icon>
              </div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.desc }}</p>
            </article>
          </div>
        </section>

        <div class="winery-detail-divider" aria-hidden="true">
          <span class="winery-detail-divider-line" />
          <span class="winery-detail-divider-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3h8l-1 9a4 4 0 0 1-8 0L8 3z" stroke="currentColor" stroke-width="1.5"
                stroke-linejoin="round" />
              <path d="M12 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          <span class="winery-detail-divider-line" />
        </div>

        <section class="winery-detail-section winery-detail-section--tips">
          <h2 class="winery-detail-section-title">到访须知</h2>
          <ul class="winery-detail-visit-guide">
            <li v-for="(item, index) in pageModel.visitGuide.items" :key="`${item.label}-${index}`">
              <strong v-if="item.label">{{ item.label }}：</strong>{{ item.text }}
            </li>
          </ul>
        </section>

        <template v-if="pageModel.services.hasContent">
          <div class="winery-detail-divider" aria-hidden="true">
            <span class="winery-detail-divider-line" />
            <span class="winery-detail-divider-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3h8l-1 9a4 4 0 0 1-8 0L8 3z" stroke="currentColor" stroke-width="1.5"
                  stroke-linejoin="round" />
                <path d="M12 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </span>
            <span class="winery-detail-divider-line" />
          </div>

          <section class="winery-detail-section winery-detail-section--tips">
            <h2 class="winery-detail-section-title">提供的服务</h2>
            <ul class="winery-detail-service-list">
              <li v-for="(service, index) in pageModel.services.items" :key="`${service}-${index}`">{{ service }}</li>
            </ul>
          </section>
        </template>

        <div class="winery-detail-divider" aria-hidden="true">
          <span class="winery-detail-divider-line" />
          <span class="winery-detail-divider-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3h8l-1 9a4 4 0 0 1-8 0L8 3z" stroke="currentColor" stroke-width="1.5"
                stroke-linejoin="round" />
              <path d="M12 12v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          <span class="winery-detail-divider-line" />
        </div>

        <section class="winery-detail-section">
          <h2 class="winery-detail-section-title">本酒庄在售酒款</h2>
          <p class="winery-detail-section-lead">以下为本站收录的、与本酒庄名称匹配的在售酒款，点击可查看详情。</p>

          <div v-if="classicWines.length" class="winery-detail-wines" :class="classicWineGridClass">
            <button v-for="(row, idx) in classicWines" :key="`${row.subNavPath}-${idx}-${row.data?.title || idx}`"
              type="button" class="winery-detail-wine-card" @click="openClassicWineWithFocus(row)">
              <div class="winery-detail-wine-thumb">
                <img :src="resolveWineThumb(row.data)" :alt="row.data?.title" loading="lazy">
              </div>
              <div class="winery-detail-wine-body">
                <div class="winery-detail-wine-title" :title="row.data?.title">{{ row.data?.title }}</div>
                <div class="winery-detail-wine-origin">{{ row.display.origin }} · {{ row.display.wineryName }}</div>
                <div class="winery-detail-wine-price" :style="{ color: GRID_PRICE_COLOR }">
                  <span class="currency">{{ splitPriceParts(row.display.saleNum, row.display.currencySymbol).currency
                  }}</span>
                  <span class="int">{{ splitPriceParts(row.display.saleNum, row.display.currencySymbol).intPart
                  }}</span>
                  <span v-if="splitPriceParts(row.display.saleNum, row.display.currencySymbol).fraction"
                    class="fraction">
                    .{{ splitPriceParts(row.display.saleNum, row.display.currencySymbol).fraction }}
                  </span>
                  <span class="unit">/ {{ row.display.saleUnit || '瓶' }}</span>
                </div>
                <div v-if="formatRating(row.display)" class="winery-detail-wine-rating">★ {{ formatRating(row.display)
                }}</div>
              </div>
            </button>
          </div>
          <p v-else class="winery-detail-empty-wines">暂未收录与本酒庄匹配的在售酒款，请稍后在酒款栏目浏览本州酒款。</p>
        </section>

        <footer class="winery-detail-footer">
          <button type="button" class="winery-detail-source"
            @click="pageModel.hasSource ? (sourceDialogVisible = true) : null">
            <el-icon>
              <InfoFilled />
            </el-icon>
            本页信息来源：{{ pageModel.sourceSummary }}
          </button>
        </footer>
      </div>

      <el-dialog v-model="sourceDialogVisible" title="信息参考来源" align-center width="min(880px, 92vw)">
        <el-table :data="pageModel.source" border>
          <el-table-column prop="title" label="条目/文章标题" width="200" />
          <el-table-column prop="desc" label="来源名称" width="200" />
          <el-table-column prop="url" label="永久链接">
            <template #default="scope">
              <el-link :href="scope.row.url" target="_blank">{{ scope.row.url }}</el-link>
            </template>
          </el-table-column>
        </el-table>
      </el-dialog>
    </template>
  </div>
</template>

<style scoped lang="scss" src="@/styles/wineryDetailPage.scss"></style>
