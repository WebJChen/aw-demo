<script setup>
import { computed, ref } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { resolveDataImage } from '@/utils/dataImageResolver'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  enTitle: { type: String, default: '' },
  banner: { type: String, default: '' },
  itemData: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const sourceDialogVisible = ref(false)

const getDefaultWineInfo = (title = '酒款详情', desc = '') => ({
  name: title || '酒款详情',
  desc: `关于${desc || '该酒款'}的详细信息，正在持续完善中。`,
  features: [
    { icon: '#22c55e', title: '产地信息', desc: '酒庄与产区信息整理中' },
    { icon: '#3b82f6', title: '联系方式', desc: '联系方式与预约方式整理中' },
    { icon: '#f59e0b', title: '开放时间', desc: '营业时间与到访建议整理中' }
  ],
  tags: ['葡萄酒', '酒庄', '信息完善中'],
  source: []
})

const itemDetail = computed(() => props.itemData?.[0] || {})
const itemInfo = computed(() => itemDetail.value?.info || itemDetail.value?.wineData || itemDetail.value?.itemData || null)

const resolveDialogImage = (image) => resolveDataImage(image, '')

const dialogImages = computed(() => {
  const imageGroups = [
    itemInfo.value?.images,
    itemInfo.value?.banners,
    itemInfo.value?.bannerList,
    itemInfo.value?.imgs,
    itemDetail.value?.images,
    itemDetail.value?.banners,
    itemDetail.value?.bannerList,
    itemDetail.value?.imgs
  ]

  const multiImages = imageGroups
    .flatMap((group) => Array.isArray(group) ? group : [])
    .map((image) => resolveDialogImage(image))
    .filter(Boolean)

  if (multiImages.length > 0) return multiImages

  const fallbackImages = [props.banner, itemDetail.value?.img]
    .map((image) => resolveDialogImage(image))
    .filter(Boolean)

  return Array.from(new Set(fallbackImages))
})

const wineInfo = computed(() => {
  const info = itemInfo.value
  if (!info || typeof info !== 'object') return getDefaultWineInfo(props.title, itemDetail.value?.wineData?.desc || itemDetail.value?.itemData?.desc || '')

  return {
    name: info.name || info.dialogInfoTitle || itemDetail.value?.title || props.title || '酒款详情',
    desc: info.desc || `关于${props.title || '该酒款'}的详细信息，正在持续完善中。`,
    features: Array.isArray(info.features) ? info.features : [],
    tags: Array.isArray(info.tags) ? info.tags : [],
    source: Array.isArray(info.source) ? info.source : []
  }
})

const hasSource = computed(() => wineInfo.value.source.length > 0)
</script>

<template>

  <el-dialog v-model="dialogVisible" :show-close="true" width="980px" class="wine-item-dialog" align-center
    :z-index="9300" :append-to-body="true" :lock-scroll="true">
    <template #header>
      <div class="dlg-title">{{ title }}<span v-if="enTitle">（{{ enTitle }}）</span></div>
    </template>

    <div class="dlg-section">
      <div class="dlg-banner w100" v-if="dialogImages.length">
        <el-carousel :interval="0" indicator-position="inside" arrow="hover" height="100%">
          <el-carousel-item v-for="(image, index) in dialogImages" :key="index">
            <el-image :src="image" alt="banner" class="carousel-image pointer" fit="cover"
              :preview-src-list="dialogImages" :initial-index="index" :zoom-rate="1.2" :max-scale="7" :min-scale="0.2"
              show-progress show-close show-toolbar show-index :preview-teleported="true" :z-index="9888" />
          </el-carousel-item>
        </el-carousel>
      </div>

      <div class="section-title" v-if="wineInfo.name">{{ wineInfo.name }}</div>
      <div class="section-desc">
        {{ wineInfo.desc }}
      </div>

      <div class="feature-grid">
        <div class="feature-card" v-for="(feature, index) in wineInfo.features" :key="index">
          <div class="icon" :style="{ background: feature.icon }"></div>
          <div class="f-title">{{ feature.title }}</div>
          <div class="f-desc">{{ feature.desc }}</div>
        </div>
      </div>
      <div class="tag-row">
        <span class="mini-tag" v-for="(tag, index) in wineInfo.tags" :key="index">{{ tag }}</span>
      </div>
    </div>

    <template #footer>
      <div class="dlg-footer">
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

  <el-dialog v-model="sourceDialogVisible" :z-index="9999" :append-to-body="true" title="信息参考来源" align-center
    width="80%" class="source-dia">
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
.wine-item-dialog {
  :deep(.el-dialog__header) {
    margin-right: 0;
    padding: 16px 20px 12px;
    border-bottom: 1px solid #f2f4f8;
  }

  :deep(.el-dialog__body) {
    padding: 0 0 8px 0;
  }
}

.dlg-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #111827;
}

.dlg-banner {
  height: 350px;

  :deep(.el-carousel),
  :deep(.el-carousel__container) {
    height: 100%;
  }

  .carousel-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
}

.dlg-section {
  letter-spacing: normal;
  text-align: left;
  max-height: 560px;
  overflow-y: auto;

  .section-title,
  .section-desc,
  .feature-grid,
  .tag-row {
    margin-left: 20px;
    margin-right: 20px;
  }

  .section-title {
    margin-top: 18px;
  }

  .tag-row {
    margin-bottom: 10px;
  }
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1f2937;
}

.section-desc {
  line-height: 1.8;
  color: #4b5563;
  margin-bottom: 16px;
  font-size: 16px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.feature-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  border: 1px solid #e5e7eb;
}

.icon {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  margin-bottom: 10px;
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

.tag-row {
  letter-spacing: normal;
  margin-top: 20px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-tag {
  background: #f3f4f6;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  color: #374151;
}

.dlg-footer {
  position: relative;
  padding: 0 12px 12px;
  margin-top: 10px;
}

.info-disclaimer {
  position: absolute;
  bottom: 12px;
  left: 12px;
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

.dlg-footer .el-button {
  margin-top: 24px;
}

@media (max-width: 768px) {
  .dlg-banner {
    height: 220px;
  }

  .feature-grid {
    grid-template-columns: repeat(1, 1fr);
  }

  .info-disclaimer {
    position: relative;
    bottom: 0;
  }
}
</style>
