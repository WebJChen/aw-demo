<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import itemJson from '@/data/item.json'
import wineJson from '@/data/wine.json'
import {
  buildSearchIndex,
  scoreRow,
  getHighlightSegments,
  saveSearchTarget
} from '@/utils/searchUtils'
import { withRandomLoading } from '@/utils/loadingUtils'

const route = useRoute()
const router = useRouter()

const pageSize = 10
const currentPage = ref(1)
const pageLoading = ref(false)

const keyword = computed(() => (typeof route.query.s === 'string' ? route.query.s.trim() : ''))
const indexRows = [...buildSearchIndex(itemJson, 'item'), ...buildSearchIndex(wineJson, 'wine')]

const allResults = computed(() => {
  if (!keyword.value) return []

  const rows = []
  for (const row of indexRows) {
    const scoreData = scoreRow(row, keyword.value)
    if (!scoreData.matched) continue

    rows.push({
      id: row.id,
      score: scoreData.score,
      navName: row.navName,
      regionPath: row.regionPath,
      subNavName: row.subNavName,
      subNavPath: row.subNavPath,
      sectionTag: row.navName,
      groupName: row.subNavName,
      title: row.title,
      enTitle: row.enTitle,
      tags: Array.isArray(row.tags) ? row.tags : [],
      desc: row.desc || '',
      itemIndex: row.itemIndex,
      itemTitle: row.title,
      matchField: scoreData.matchField,
      sourceType: row.sourceType
    })
  }

  rows.sort((a, b) => b.score - a.score)
  return rows
})

const totalResults = computed(() => allResults.value.length)
const hasResults = computed(() => totalResults.value > 0)
const pagedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return allResults.value.slice(start, start + pageSize)
})

watch(keyword, async () => {
  await withRandomLoading(async () => {
    pageLoading.value = true
    currentPage.value = 1
  }, { min: 80, max: 300 })
  pageLoading.value = false
}, { immediate: true })

const handlePageChange = async (page) => {
  if (page === currentPage.value) return
  await withRandomLoading(async () => {
    pageLoading.value = true
    currentPage.value = page
  }, { min: 80, max: 300 })
  pageLoading.value = false
}

const openResult = (result) => {
  const targetRoute = {
    name: result.regionPath,
    params: { subNav: result.subNavPath },
    query: {
      s: keyword.value,
      hit: result.id
    }
  }

  saveSearchTarget({
    s: keyword.value,
    hit: result.id,
    sourceType: result.sourceType,
    pending: true,
    regionPath: result.regionPath,
    subNavPath: result.subNavPath,
    itemIndex: result.itemIndex,
    itemTitle: result.itemTitle,
    ts: Date.now()
  })

  const href = router.resolve(targetRoute).href
  window.open(href, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="search-results-page">
    <div class="search-header">
      <div class="search-title">
        <h1>全站搜索</h1>
        <p v-if="keyword">“{{ keyword }}” 的搜索结果，共 {{ totalResults }} 条</p>
        <p v-else>请输入关键词开始搜索</p>
      </div>
    </div>

    <div class="results-section" v-loading.fullscreen="pageLoading" element-loading-spinner-color="#279486"
      element-loading-background="rgba(255, 255, 255, 0.8)">
      <div v-if="hasResults" class="results-list">
        <article v-for="result in pagedResults" :key="result.id" class="result-card">
          <div class="result-meta">
            <span class="meta-tag">
              <span v-for="(seg, idx) in getHighlightSegments(result.sectionTag, keyword)" :key="`m1-${idx}`">
                <span v-if="seg.highlight" class="result-title-highlight">{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
              </span>
            </span>
            <span class="meta-sub">
              <span v-for="(seg, idx) in getHighlightSegments(result.groupName, keyword)" :key="`m2-${idx}`">
                <span v-if="seg.highlight" class="result-title-highlight">{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
              </span>
            </span>
            <span class="meta-source" :class="result.sourceType">{{ result.sourceType === 'wine' ? '酒' : '酒庄' }}</span>
          </div>

          <h3 class="result-title">
            <span v-for="(seg, idx) in getHighlightSegments(result.title, keyword)" :key="`t-${idx}`">
              <span v-if="seg.highlight" class="result-title-highlight">{{ seg.text }}</span>
              <span v-else>{{ seg.text }}</span>
            </span>
            <span v-if="result.enTitle" class="result-en-title">
              -
              <span v-for="(seg, idx) in getHighlightSegments(result.enTitle, keyword)" :key="`e-${idx}`">
                <span v-if="seg.highlight" class="result-title-highlight">{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
              </span>
            </span>
          </h3>

          <p v-if="result.desc" class="result-desc">
            <span v-for="(seg, idx) in getHighlightSegments(result.desc, keyword)" :key="`d-${idx}`">
              <span v-if="seg.highlight" class="result-title-highlight">{{ seg.text }}</span>
              <span v-else>{{ seg.text }}</span>
            </span>
          </p>

          <div v-if="result.tags?.length" class="result-tags">
            <span v-for="(tag, tagIdx) in result.tags" :key="`tag-${result.id}-${tagIdx}`" class="result-tag">
              <span v-for="(seg, idx) in getHighlightSegments(tag, keyword)" :key="`tg-${tagIdx}-${idx}`">
                <span v-if="seg.highlight" class="result-title-highlight">{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
              </span>
            </span>
          </div>

          <div class="result-actions">
            <el-button type="primary" text @click="openResult(result)">新窗口打开并定位</el-button>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <p>未找到匹配的内容，可以尝试更换关键词。</p>
      </div>

      <div class="pagination-wrapper" v-if="hasResults && totalResults > pageSize">
        <el-pagination :current-page="currentPage" :page-size="pageSize" :total="totalResults"
          layout="prev, pager, next" background @current-change="handlePageChange" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-results-page {
  width: 90%;
  margin: 40px auto 80px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  color: #111827;
}

.search-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  box-shadow: 0 10px 30px rgba(148, 163, 184, 0.2);
}

.search-title h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: #0f172a;
}

.search-title p {
  margin: 8px 0 0;
  color: #475569;
  font-size: 15px;
}

.empty-state {
  text-align: center;
  font-size: 16px;
  color: #64748b;
  padding: 34px 0;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}

.meta-tag {
  background: #eef2ff;
  color: #4338ca;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
}

.meta-sub {
  background: #ecfeff;
  color: #0f766e;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 500;
}

.meta-source {
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 11px;
}

.meta-source.wine {
  background: #fef3c7;
  color: #92400e;
}

.meta-source.item {
  background: #dbeafe;
  color: #1e40af;
}

.result-title {
  font-size: 20px;
  margin: 0;
  color: #0f172a;
}

.result-en-title {
  color: #475569;
  font-size: 16px;
  font-weight: 500;
}

.result-title-highlight {
  color: #33b1a3;
  font-weight: 700;
}

.result-desc {
  margin: 0;
  color: #334155;
  font-size: 14px;
  line-height: 1.7;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.result-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #166534;
  font-size: 12px;
  font-weight: 600;
}

.result-actions {
  margin-top: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

@media (max-width: 768px) {
  .search-results-page {
    width: 95%;
    margin-top: 28px;
  }
}
</style>
