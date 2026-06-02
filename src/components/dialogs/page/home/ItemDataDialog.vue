<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, InfoFilled } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { resolveDataImage } from '@/utils/dataImageResolver'
import { resolveItemDetailImageUrls } from '@/utils/itemImageResolver'
import { Z_INDEX } from '@/constants/zIndex'
import { useDeviceStore } from '@/stores/deviceStore'
import { buildWineDisplay, wineSpecRows } from '@/utils/wineGridExtras'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  enTitle: { type: String, default: '' },
  banner: { type: String, default: '' },
  itemData: { type: Array, default: () => [] },
  /** 来自当前大区导航名，用作缺省产地等展示 */
  regionNavName: { type: String, default: '' }
})

const emit = defineEmits(['update:visible', 'add-cart'])

const deviceStore = useDeviceStore()
const { isPhone, isTablet, isMobile } = storeToRefs(deviceStore)

/** 移动端/平板布局与层级：优先 deviceStore（与网格等页一致）；z-index 用 Z_INDEX */
const dialogWidth = computed(() => {
  if (isPhone.value) return 'calc(100vw - 20px)'
  if (isTablet.value) return 'min(760px, 94vw)'
  return '920px'
})

/** 轮播高度与 tto-demo TripDialog 桌面 `dlg-banner` 一致（手机收紧为 220px） */
const bannerCarouselHeight = computed(() => {
  if (isPhone.value) return 220
  if (isTablet.value) return 360
  return 380
})

/** 正文滚动区高度：移动端用视口比例，桌面用上限 px（与 deviceStore 断点一致） */
const dlgSectionMaxHeight = computed(() => {
  if (isPhone.value) return 'min(62vh, 520px)'
  if (isTablet.value) return 'min(65vh, 580px)'
  return 'min(70vh, 580px)'
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const sourceDialogVisible = ref(false)
const addCartQuantity = ref(1)

const bannerCarouselRef = ref(null)

/** 弹窗正文占位（暂不读 JSON） */
const WINE_DIALOG_STUB = {
  sidebarImageAlt: '酒款酒庄氛围示意（占位）',
  intro:
    '该款为澳大利亚酒庄代表性作品之一（占位描述）。果实手工拣选并经冷浸渍与温控发酵：入口结构清晰，果味与单宁平衡，收口干净。以下内容用于展示版式——接入数据后可替换为真实品鉴笔记与酒庄故事。',
  specTitle: '酒款要点',
  specs: [
    { label: '建议类型：', value: '干型红葡萄酒 · 瓶中陈年潜力约 5–8 年（示例，占位）' },
    { label: '葡萄品种：', value: '以黑皮诺/西拉/赤霞珠等其中之一为主（占位，按实标为准）。' },
    { label: '产区与风格：', value: '凉爽海风与昼夜温差带来高酸骨架；酒香以红色浆果、香料与隐约橡木为辅。' },
    { label: '酿造要点：', value: '小规模罐内发酵；部分法国橡木桶陈酿以柔化单宁（示例）。' },
    { label: '醒酒与侍酒：', value: '室温略低于环境温度；开瓶后醒酒 25–45 分钟更易展开层次。' },
    { label: '餐酒搭配：', value: '烤禽、根茎类焗菜、陈年硬质奶酪或与酱汁柔和的红肉。' }
  ],
  features: [
    { icon: 'linear-gradient(145deg,#c92a52 0%,#a8163c 100%)', title: '香气层次', desc: '覆盆子、黑胡椒与香草气息交织，醒酒后果香渐显、橡木不过分抢戏。' },
    { icon: 'linear-gradient(145deg,#b91c48 0%,#9f1239 100%)', title: '口感结构', desc: '酸度挺立撑起中段果肉感，单宁细密，余味带烘烤与可可余韵（示例）。' },
    { icon: 'linear-gradient(145deg,#d44a6f 0%,#c92a52 100%)', title: '适饮场合', desc: '家宴佐餐、酒庄礼品或周末慢饮；冰镇白/桃红不适用本示例描述，请以实款为准。' }
  ],
  priceBlock: {
    title: '价格与税费说明',
    headline: '单瓶含税展示价 · ¥188 / 瓶',
    headlineNote: '（示例价；与网格占位价保持一致）',
    includesTitle: '费用包含说明：',
    includes: ['含税展示的在线标价（占位）', '防震包装与外箱耗材（基础款）', '正规发票与溯源信息申请入口（请咨询客服激活）'],
    excludesTitle: '以下可能产生追加费用：',
    excludes: ['偏远地区加收的运费差额', '指定时段加急出库与冷链附加费（若有）', '跨境或特殊监管通道产生的代缴税费（如适用）'],
    footnote: '* 付款、退款与售后细则以网站公布的条款为准；占位文案可随时替换为正式法务文本。'
  },
  tags: ['澳大利亚酒庄', '干红示例', '网格可加购', '详询温控与运力']
}

const itemDetail = computed(() => props.itemData?.[0] || {})
const itemInfo = computed(() => itemDetail.value?.info || itemDetail.value?.wineData || itemDetail.value?.itemData || null)

/** 与网格 `ItemGrid.vue` 酒款标价一致的字号与色号（标题下方主价展示） */
const GRID_PRICE_COLOR = '#a8163c'

const wineDisplay = computed(() => buildWineDisplay(itemDetail.value, { regionNavName: props.regionNavName }))

const splitIntoGridPriceParts = (num, currencySym) => {
  const n = Number(num)
  const safe = Number.isFinite(n) && n >= 0 ? n : 0
  const s = Math.abs(safe).toFixed(2)
  const [intPart, dec] = s.split('.')
  return {
    intPart,
    fraction: dec !== '00' ? dec : null,
    currency: currencySym
  }
}

const dialogPriceParts = computed(() => {
  const w = wineDisplay.value
  return splitIntoGridPriceParts(w.saleNum, w.currencySymbol)
})

const dialogListPriceParts = computed(() => {
  const w = wineDisplay.value
  return splitIntoGridPriceParts(w.listNum, w.currencySymbol)
})

const dialogSpecRows = computed(() =>
  wineSpecRows(wineDisplay.value, WINE_DIALOG_STUB.specs.filter((row) => row.label !== '产区与风格：'))
)

const dialogDiscountSaveLabel = computed(() => {
  const w = wineDisplay.value
  if (!w.hasDiscount || w.saveAmount <= 1e-6) return ''
  const amt = Math.round(w.saveAmount * 100) / 100
  const txt = amt % 1 === 0 ? String(Math.round(amt)) : amt.toFixed(2)
  return `立省 ${w.currencySymbol}${txt}`
})

const dialogPriceAriaLabel = computed(() => {
  const p = dialogPriceParts.value
  const frac = p.fraction ? `.${p.fraction}` : ''
  return `${p.currency}${p.intPart}${frac}`
})

const priceSectionHeadline = computed(() => {
  const p = dialogPriceParts.value
  const frac = p.fraction ? `.${p.fraction}` : ''
  return `单瓶含税展示价 · ${p.currency}${p.intPart}${frac} / 瓶`
})

/** 未传第二参时用 `dataImageResolver` 内置默认图（与全站缺图一致），勿写死其它资源路径 */
const resolveDialogImage = (image) => resolveDataImage(image)

const dialogImages = computed(() => {
  const urls = resolveItemDetailImageUrls(itemDetail.value)
  if (urls.length) return urls
  return [resolveDialogImage('')]
})

const headlineRoute = computed(() => {
  const t = props.title?.trim()
  return t ? `${t} · 酒款介绍` : '澳大利亚瓶装葡萄酒 · 酒款介绍'
})

/** 底部「信息来源」：与改动前逻辑一致——仅 JSON 内 `info/wineData/itemData.source` 有条目才显示来源并可点开表格；无数据视为原创不变、不弹窗 */
const wineInfo = computed(() => {
  const info = itemInfo.value
  if (!info || typeof info !== 'object') {
    return { source: [] }
  }
  return {
    source: Array.isArray(info.source) ? info.source : []
  }
})

const hasSource = computed(() => wineInfo.value.source.length > 0)

const sidebarPortraitSrc = computed(() => dialogImages.value[0] || '')

const showWineCartFeedback = (result, maxItems) => {
  if (result === 'success') {
    ElMessage({ type: 'success', message: '已加入购物车', showClose: true, offset: 24 })
  } else if (result === 'limit') {
    ElMessage({
      type: 'warning',
      message: `购物车数量已达上限（${maxItems || 500}）`,
      showClose: true,
      offset: 24
    })
  } else if (result === 'invalid') {
    ElMessage({
      type: 'error',
      message: '加入购物车失败：所选商品无效或缺少名称',
      showClose: true,
      offset: 24
    })
  } else {
    ElMessage({ type: 'error', message: '加入购物车失败，请稍后重试', showClose: true, offset: 24 })
  }
}

const handleDialogAddCart = () => {
  if (!itemDetail.value || typeof itemDetail.value !== 'object') return
  let resultHandled = false
  emit('add-cart', {
    item: itemDetail.value,
    quantity: addCartQuantity.value,
    onResult: (result, extra = {}) => {
      resultHandled = true
      showWineCartFeedback(result, extra.maxCartItems)
    }
  })
  setTimeout(() => {
    if (resultHandled) return
    showWineCartFeedback('error')
  }, 320)
}

watch(dialogVisible, (visible) => {
  if (visible) {
    addCartQuantity.value = 1
    nextTick(() => {
      if (bannerCarouselRef.value?.setActiveItem) {
        bannerCarouselRef.value.setActiveItem(0)
      }
    })
  } else {
    sourceDialogVisible.value = false
  }
})

onMounted(() => deviceStore.startListen())
onUnmounted(() => deviceStore.stopListen())
</script>

<template>
  <el-dialog v-model="dialogVisible" :show-close="false" :width="dialogWidth"
    class="wine-item-dialog wine-detail-dialog" :class="{
      'wine-detail-dialog--phone': isPhone,
      'wine-detail-dialog--tablet': isTablet,
      'wine-detail-dialog--mobile': isMobile
    }" align-center :z-index="Z_INDEX.dialog.base" :append-to-body="true" :lock-scroll="true">
    <template #header="{ close }">
      <div class="dlg-header">
        <div class="dlg-title-wrap">
          <div class="dlg-title">{{ title }}<span v-if="enTitle">（{{ enTitle }}）</span></div>
        </div>
        <div class="dlg-header-right">
          <el-icon class="dlg-close" @click="close">
            <Close />
          </el-icon>
        </div>
      </div>
    </template>

    <div class="dlg-section" :style="{ maxHeight: dlgSectionMaxHeight }">
      <div v-if="dialogImages.length" class="dlg-banner" :style="{ height: `${bannerCarouselHeight}px` }">
        <el-carousel ref="bannerCarouselRef" :interval="0" indicator-position="inside" arrow="hover"
          :height="`${bannerCarouselHeight}px`">
          <el-carousel-item v-for="(image, index) in dialogImages" :key="index">
            <el-image :src="image" alt="banner" class="carousel-image pointer" fit="cover"
              :preview-src-list="dialogImages" :initial-index="index" :zoom-rate="1.2" :max-scale="7" :min-scale="0.2"
              show-progress show-close show-toolbar show-index :preview-teleported="true"
              :z-index="Z_INDEX.dialog.imagePreview" />
          </el-carousel-item>
        </el-carousel>
      </div>

      <div class="dlg-text">
        <div class="content-with-map">
          <div class="content-left">
            <div class="section-title fowe7">{{ headlineRoute }}</div>
            <div class="dlg-intro-price-wrap">
              <div v-if="wineDisplay.hasDiscount" class="dlg-discount-band">
                <div class="dlg-discount-top">
                  <span class="dlg-discount-badge">限时折扣 · 专享价</span>
                  <span v-if="dialogDiscountSaveLabel" class="dlg-discount-save">{{ dialogDiscountSaveLabel }}</span>
                </div>
                <div class="dlg-list-price-row">
                  <span class="dlg-list-price-caption">专柜参考价</span>
                  <span class="dlg-list-price-cross">
                    {{ dialogListPriceParts.currency }}{{ dialogListPriceParts.intPart }}
                    <template v-if="dialogListPriceParts.fraction">.{{ dialogListPriceParts.fraction }}</template>
                  </span>
                </div>
              </div>
              <div class="info-price dlg-sale-price-main" :style="{ '--aw-price-color': GRID_PRICE_COLOR }"
                :aria-label="dialogPriceAriaLabel">
                <span class="dlg-sale-caption">{{ wineDisplay.hasDiscount ? '含税现价' : '含税标价' }}</span>
                <span class="info-price-inner">
                  <span class="info-price-sym fowe7">{{ dialogPriceParts.currency }}</span>
                  <span class="info-price-main">
                    <span class="info-price-int">{{ dialogPriceParts.intPart }}</span>
                    <span v-if="dialogPriceParts.fraction" class="info-price-frac">.{{
                      dialogPriceParts.fraction }}</span>
                  </span>
                </span>
              </div>
            </div>
            <div class="section-desc">{{ WINE_DIALOG_STUB.intro }}</div>
            <div class="map-details">
              <h3 class="map-title">{{ WINE_DIALOG_STUB.specTitle }}</h3>
              <div v-for="(row, i) in dialogSpecRows" :key="i" class="detail-item">
                <span class="detail-label">{{ row.label }}</span>
                <span class="detail-value">{{ row.value }}</span>
              </div>
            </div>
          </div>
          <div class="map-image">
            <img v-if="sidebarPortraitSrc" :src="sidebarPortraitSrc" :alt="WINE_DIALOG_STUB.sidebarImageAlt" />
          </div>
        </div>

        <div class="feature-grid">
          <div v-for="(feature, index) in WINE_DIALOG_STUB.features" :key="index" class="feature-card">
            <div class="icon" :style="{ background: feature.icon }"></div>
            <div class="f-title">{{ feature.title }}</div>
            <div class="f-desc">{{ feature.desc }}</div>
          </div>
        </div>

        <div class="price-section">
          <h3 class="price-title">{{ WINE_DIALOG_STUB.priceBlock.title }}</h3>
          <div class="price-items">
            <div class="price-item">{{ priceSectionHeadline }}<span class="child-price">{{
              WINE_DIALOG_STUB.priceBlock.headlineNote }}</span></div>
          </div>
          <div class="price-includes">
            <div class="includes-title">{{ WINE_DIALOG_STUB.priceBlock.includesTitle }}</div>
            <ul class="includes-list">
              <li v-for="(item, ii) in WINE_DIALOG_STUB.priceBlock.includes" :key="'inc-' + ii">{{ item }}</li>
            </ul>
          </div>
          <div class="price-excludes">
            <div class="excludes-title">{{ WINE_DIALOG_STUB.priceBlock.excludesTitle }}</div>
            <ul class="excludes-list">
              <li v-for="(item, ii) in WINE_DIALOG_STUB.priceBlock.excludes" :key="'exc-' + ii">{{ item }}</li>
            </ul>
          </div>
          <div class="price-note">{{ WINE_DIALOG_STUB.priceBlock.footnote }}</div>
        </div>

        <div class="tag-row">
          <span v-for="(tag, index) in WINE_DIALOG_STUB.tags" :key="index" class="mini-tag">{{ tag }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dlg-footer">
        <div class="cart-action-row">
          <el-input-number v-model="addCartQuantity" :min="1" :max="99" size="small" />
          <el-button type="primary" @click="handleDialogAddCart">加入购物车</el-button>
        </div>
        <div class="info-disclaimer" @click="hasSource ? (sourceDialogVisible = true) : null">
          <el-icon class="info-icon">
            <InfoFilled />
          </el-icon>
          <template v-if="hasSource">
            本页信息来源：{{ wineInfo.source[0].desc }}
          </template>
          <template v-else>
            本页信息来源：TasTrips.Online资料整理
          </template>
        </div>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="sourceDialogVisible" :z-index="Z_INDEX.dialog.nested" :append-to-body="true" title="信息参考来源"
    align-center width="80%" class="source-dia">
    <el-table :data="wineInfo.source" border>
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

<style lang="scss" scoped>
.wine-detail-dialog {
  :deep(.el-dialog__headerbtn) {
    display: none;
  }

  &.wine-detail-dialog--phone :deep(.el-dialog__header) {
    padding: 12px 14px 10px;
  }

  :deep(.el-dialog__body) {
    padding: 0 0 8px;
  }

  .dlg-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;

    .dlg-title-wrap {
      flex: 1;
      min-width: 0;
      padding-right: 6px;

      .dlg-title {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 2px;
        color: #111827;
        line-height: 1.3;
        word-break: break-word;
      }
    }

    .dlg-header-right {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;

      .dlg-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        font-size: 22px;
        flex-shrink: 0;
        color: #909399;
        cursor: pointer;
        transition: color 0.3s;

        &:hover {
          color: #409eff;
        }
      }
    }
  }

  .dlg-section {
    letter-spacing: normal;
    text-align: left;
    overflow-y: auto;

    .dlg-banner {
      flex-shrink: 0;
      overflow: hidden;

      :deep(.el-carousel__container) {
        height: 100%;
      }

      .carousel-image {
        width: 100%;
        height: 100%;
        display: block;
      }

      .carousel-image :deep(.el-image__inner) {
        object-fit: cover;
      }
    }

    .dlg-text {
      padding: 25px 20px 10px;

      .content-with-map {
        display: flex;
        gap: 24px;
        align-items: flex-start;
        margin-bottom: 24px;

        .content-left {
          flex: 1;
          min-width: 0;

          .section-title {
            color: #a8163c;
            font-size: 20px;
            letter-spacing: 2px;
            margin-bottom: 8px;
          }

          /* 网格酒款卡片 `ItemGrid.vue` `.info-price` 同款结构 + 折扣腰带 */
          .dlg-intro-price-wrap {
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;

            .dlg-discount-band {
              padding: 10px 12px;
              border-radius: 10px;
              background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
              border: 1px solid rgba(234, 88, 12, 0.28);
            }

            .dlg-discount-top {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 10px;
              margin-bottom: 6px;
            }

            .dlg-discount-badge {
              font-size: 12px;
              font-weight: 800;
              color: #fff;
              padding: 4px 10px;
              border-radius: 999px;
              background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
            }

            .dlg-discount-save {
              font-size: 13px;
              font-weight: 700;
              color: #9a3412;
            }

            .dlg-list-price-row {
              display: flex;
              align-items: baseline;
              gap: 8px;
              flex-wrap: wrap;
            }

            .dlg-list-price-caption {
              font-size: 12px;
              color: #78716c;
            }

            .dlg-list-price-cross {
              font-size: 14px;
              font-weight: 600;
              color: #78716c;
              text-decoration: line-through;
            }

            .dlg-sale-price-main {
              display: flex;
              align-items: baseline;
              flex-wrap: wrap;
              gap: 10px;
            }

            .dlg-sale-caption {
              font-size: 13px;
              font-weight: 700;
              color: #92400e;
              flex-shrink: 0;
            }

            .info-price {
              color: var(--aw-price-color, #a8163c);
              letter-spacing: 0;
              line-height: 1.05;
              margin-top: 2px;

              .info-price-inner {
                display: inline-flex;
                align-items: baseline;
                flex-wrap: nowrap;
              }

              .info-price-sym {
                flex-shrink: 0;
                font-size: clamp(13px, 2.5vw, 16px);
                margin-right: 5px;
                line-height: 1;
              }

              .info-price-main {
                display: inline-flex;
                align-items: baseline;
                flex-wrap: nowrap;
                font-weight: 800;
              }

              .info-price-int {
                font-size: clamp(22px, 4vw, 30px);
                line-height: 1;
              }

              .info-price-frac {
                flex-shrink: 0;
                font-size: clamp(12px, 2.5vw, 15px);
                font-weight: 700;
                line-height: 1;
                margin-left: 0.03em;
                transform: translateY(-0.2em);
              }
            }
          }

          .section-desc {
            font-size: 16px;
            line-height: 1.8;
            color: #4b5563;
            margin-bottom: 30px;
          }

          .map-details {
            margin-top: 16px;

            .map-title {
              font-size: 20px;
              font-weight: 700;
              color: #7f1d1d;
              margin-bottom: 16px;
            }

            .detail-item {
              margin-bottom: 12px;
              font-size: 14px;
              line-height: 1.6;

              .detail-label {
                color: #6b7280;
                font-weight: 500;
              }

              .detail-value {
                color: #111827;
              }
            }
          }
        }

        .map-image {
          flex: 1;
          min-width: 0;
          border-radius: 8px;
          overflow: hidden;

          img {
            width: 100%;
            height: auto;
            display: block;
          }
        }
      }

      .feature-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;

        .feature-card {
          background: #fff;
          border-radius: 12px;
          padding: 18px;
          border: 1px solid rgba(168, 22, 60, 0.12);

          .icon {
            width: 40px;
            height: 40px;
            border-radius: 999px;
            margin-bottom: 10px;
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
          }

          .f-title {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 6px;
          }

          .f-desc {
            color: #6b7280;
            line-height: 1.7;
          }
        }
      }

      .price-section {
        margin-top: 24px;
        padding: 20px;
        background-color: #fef6f8;
        border-radius: 8px;
        border: 1px solid rgba(168, 22, 60, 0.12);

        .price-title {
          font-size: 18px;
          font-weight: 700;
          color: #7f1d1d;
          margin-bottom: 12px;
        }

        .price-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;

          .price-item {
            font-size: 16px;
            color: #a8163c;
            font-weight: 600;

            .child-price {
              font-size: 14px;
              color: #6b7280;
              font-weight: 400;
              margin-left: 4px;
            }
          }
        }

        .price-includes,
        .price-excludes {
          margin-bottom: 16px;

          .includes-title,
          .excludes-title {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
          }

          .includes-list,
          .excludes-list {
            margin: 0;
            padding-left: 20px;
            list-style-type: none;

            li {
              font-size: 13px;
              color: #4b5563;
              line-height: 1.8;
              position: relative;
              padding-left: 12px;

              &::before {
                content: '•';
                position: absolute;
                left: 0;
                color: #6b7280;
              }
            }
          }
        }

        .price-includes {
          .includes-title {
            color: #059669;
          }

          .includes-list li::before {
            color: #059669;
          }
        }

        .price-excludes {
          .excludes-title {
            color: #dc2626;
          }

          .excludes-list li::before {
            color: #dc2626;
          }
        }

        .price-note {
          font-size: 12px;
          color: #6b7280;
          font-style: italic;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(168, 22, 60, 0.15);
        }
      }

      .tag-row {
        letter-spacing: normal;
        margin-top: 20px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        .mini-tag {
          background: rgba(168, 22, 60, 0.08);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          color: #991b36;
        }
      }
    }
  }

  .dlg-footer {
    position: relative;
    padding: 8px 12px 14px;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;

    .cart-action-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;

      :deep(.el-input-number) {
        display: inline-flex;
        align-items: center;
      }

      .el-button {
        border-radius: 8px;
        padding: 0 18px;
        margin-top: 0;
      }
    }

    .info-disclaimer {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        text-decoration: underline;
      }

      .info-icon {
        color: #9ca3af;
        font-size: 14px;
        transition: all 0.2s;
      }

      &:hover .info-icon {
        color: #6b7280;
      }
    }
  }

  &.wine-detail-dialog--phone {
    .dlg-header {
      gap: 8px;
      align-items: center;

      .dlg-title-wrap {
        flex: 1 1 100%;

        .dlg-title {
          letter-spacing: 1px;
          font-size: 17px;
        }
      }

      .dlg-header-right {
        margin-left: auto;
        gap: 6px;

        .dlg-close {
          width: 34px;
          height: 34px;
        }
      }
    }

    .dlg-section {
      .dlg-text {
        .feature-grid {
          grid-template-columns: repeat(1, 1fr);
        }

        .content-with-map {
          flex-direction: column;

          .map-image {
            margin-top: 16px;
          }
        }
      }
    }

    .dlg-footer {
      min-height: 0;

      .info-disclaimer {
        position: relative;
        bottom: 0;
        left: auto;
      }
    }
  }

  &.wine-detail-dialog--tablet {

    /* 平板与中屏沿用 deviceStore breakpoint，版图仍与桌面同为左右分栏 Trip 同款比例 */
    .dlg-section {
      .dlg-text .content-with-map .map-image {
        flex: 1;
      }
    }
  }
}

@media (min-width: 1025px) {
  .wine-detail-dialog {
    :deep(.el-dialog__header) {
      padding: 14px 18px 10px;
    }

    :deep(.el-dialog__body) {
      padding-bottom: 6px;
    }

    .dlg-header {
      gap: 8px;

      .dlg-title-wrap {
        .dlg-title {
          font-size: 20px;
          letter-spacing: 1px;
        }
      }

      .dlg-header-right {
        .dlg-close {
          width: 30px;
          height: 30px;
          font-size: 20px;
        }
      }
    }

    .dlg-section {
      .dlg-banner {
        border-radius: 0;
      }

      .dlg-text {
        padding: 20px 18px 8px;

        .content-with-map {
          gap: 18px;
          margin-bottom: 18px;

          .content-left {
            .section-title {
              font-size: 18px;
              margin-bottom: 6px;
              letter-spacing: 1px;
            }

            .dlg-intro-price-wrap {
              margin-bottom: 12px;
              gap: 8px;

              .dlg-discount-band {
                padding: 8px 10px;
              }

              .dlg-discount-top {
                gap: 8px;
                margin-bottom: 4px;
              }

              .dlg-discount-badge {
                font-size: 11px;
                padding: 3px 8px;
              }

              .dlg-discount-save {
                font-size: 12px;
              }

              .dlg-list-price-row {
                gap: 6px;
              }

              .dlg-list-price-caption {
                font-size: 11px;
              }

              .dlg-list-price-cross {
                font-size: 13px;
              }

              .dlg-sale-price-main {
                gap: 8px;
              }

              .dlg-sale-caption {
                font-size: 12px;
              }

              .info-price {
                .info-price-sym {
                  font-size: clamp(12px, 2.2vw, 14px);
                }

                .info-price-int {
                  font-size: clamp(19px, 3.6vw, 25px);
                }

                .info-price-frac {
                  font-size: clamp(11px, 2.2vw, 13px);
                }
              }
            }

            .section-desc {
              font-size: 15px;
              line-height: 1.72;
              margin-bottom: 22px;
            }

            .map-details {
              margin-top: 12px;

              .map-title {
                font-size: 18px;
                margin-bottom: 12px;
              }

              .detail-item {
                margin-bottom: 10px;
                font-size: 13px;
                line-height: 1.55;
              }
            }
          }
        }

        .feature-grid {
          gap: 12px;

          .feature-card {
            border-radius: 10px;
            padding: 14px;

            .icon {
              width: 34px;
              height: 34px;
              margin-bottom: 8px;
            }

            .f-title {
              font-size: 14px;
              margin-bottom: 4px;
            }

            .f-desc {
              font-size: 13px;
              line-height: 1.6;
            }
          }
        }

        .price-section {
          margin-top: 18px;
          padding: 16px;

          .price-title {
            font-size: 16px;
            margin-bottom: 10px;
          }

          .price-items {
            gap: 6px;
            margin-bottom: 12px;

            .price-item {
              font-size: 14px;

              .child-price {
                font-size: 13px;
              }
            }
          }

          .price-includes,
          .price-excludes {
            margin-bottom: 12px;

            .includes-title,
            .excludes-title {
              font-size: 13px;
              margin-bottom: 6px;
            }

            .includes-list,
            .excludes-list {
              li {
                font-size: 12px;
                line-height: 1.65;
              }
            }
          }

          .price-note {
            font-size: 11px;
            margin-top: 10px;
            padding-top: 10px;
          }
        }

        .tag-row {
          margin-top: 16px;
          gap: 6px;

          .mini-tag {
            padding: 5px 8px;
            font-size: 11px;
          }
        }
      }
    }

    .dlg-footer {
      padding: 6px 10px 12px;
      margin-top: 8px;
      gap: 8px;

      .cart-action-row {
        gap: 6px;

        .el-button {
          padding: 0 14px;
          border-radius: 6px;
        }
      }

      .info-disclaimer {
        font-size: 11px;

        .info-icon {
          font-size: 13px;
        }
      }
    }
  }
}
</style>
