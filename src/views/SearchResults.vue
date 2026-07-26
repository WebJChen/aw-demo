<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Search } from '@element-plus/icons-vue'
import {
  getHighlightSegments,
  normalizeSearchSourceType,
  resolveSearchResultRoute,
  saveSearchTarget,
  buildSearchResultsRoute,
  SEARCH_SOURCE_ITEM,
} from '@/utils/searchUtils'
import { searchCatalog, SEARCH_PAGE_SIZE } from '@/utils/searchService'
import { showApiError } from '@/utils/apiFeedback'

const route = useRoute()
const router = useRouter()

const pageSize = SEARCH_PAGE_SIZE
const currentPage = ref(1)
const pageLoading = ref(false)
const searchRows = ref([])
const totalResults = ref(0)
const localKeyword = ref('')

const keyword = computed(() => (typeof route.query.s === 'string' ? route.query.s.trim() : ''))
const sourceTypeFilter = computed(() => normalizeSearchSourceType(route.query.type))

const searchScopeLabel = computed(() => {
  if (sourceTypeFilter.value === 'wine') return '酒款搜索'
  if (sourceTypeFilter.value === 'item') return '酒庄搜索'
  return '全站搜索'
})

const performSearch = async (rawKeyword, pageNum = 1) => {
  const currentKeyword = String(rawKeyword || '').trim()
  if (!currentKeyword) {
    searchRows.value = []
    totalResults.value = 0
    return
  }

  try {
    const type = sourceTypeFilter.value || 'all'
    const payload = await searchCatalog(currentKeyword, {
      type,
      pageNum,
      pageSize,
    })
    searchRows.value = Array.isArray(payload?.results) ? payload.results : []
    totalResults.value = Number(payload?.total) || searchRows.value.length
  } catch (error) {
    showApiError(error, '搜索失败，请稍后再试')
    searchRows.value = []
    totalResults.value = 0
  }
}

const hasResults = computed(() => totalResults.value > 0)
const pagedResults = computed(() => searchRows.value)

watch(keyword, (value) => {
  localKeyword.value = value
})

watch([keyword, sourceTypeFilter], async () => {
  pageLoading.value = true
  currentPage.value = 1
  try {
    await performSearch(keyword.value, 1)
  } finally {
    pageLoading.value = false
  }
}, { immediate: true })

const handlePageChange = async (page) => {
  if (page === currentPage.value) return
  pageLoading.value = true
  currentPage.value = page
  try {
    await performSearch(keyword.value, page)
  } finally {
    pageLoading.value = false
  }
}

const submitSearch = async () => {
  const nextKeyword = String(localKeyword.value || '').trim()
  if (!nextKeyword) return
  const target = buildSearchResultsRoute(nextKeyword, sourceTypeFilter.value)
  if (!target) return
  await router.push(target)
}

const goBack = () => {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  if (sourceTypeFilter.value === SEARCH_SOURCE_ITEM) {
    router.push({ name: 'Home' })
    return
  }
  router.push({ name: 'WineGrid' })
}

const openResult = (result) => {
  const targetRoute = resolveSearchResultRoute(result, keyword.value)
  if (!targetRoute) return

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
      <div class="search-toolbar">
        <el-button class="search-back-btn" @click="goBack">
          <el-icon class="search-back-btn__icon">
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
        <el-input
          v-model="localKeyword"
          class="search-toolbar-input"
          size="large"
          clearable
          :placeholder="sourceTypeFilter === 'wine' ? '搜索酒款名称、酒庄、风味…' : sourceTypeFilter === 'item' ? '搜索酒庄名称、简介、标签…' : '搜索酒庄或酒款…'"
          @keyup.enter="submitSearch"
          @clear="localKeyword = ''"
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-button type="primary" class="search-toolbar-submit" size="large" @click="submitSearch">搜索</el-button>
      </div>
      <div class="search-title">
        <h1>{{ searchScopeLabel }}</h1>
        <p v-if="keyword">
          “{{ keyword }}” 的{{ sourceTypeFilter === 'wine' ? '酒款' : sourceTypeFilter === 'item' ? '酒庄' : '全站' }}搜索结果，共
          {{ totalResults }} 条
        </p>
        <p v-else>请输入关键词开始搜索</p>
      </div>
    </div>

    <div
      class="results-section"
      v-loading.fullscreen="pageLoading"
      element-loading-spinner-color="#a8163c"
      element-loading-background="rgba(255, 255, 255, 0.8)"
    >
      <div v-if="hasResults" class="results-list">
        <article v-for="result in pagedResults" :key="result.id" class="result-card">
          <div class="result-meta">
            <span class="meta-tag">
              <span v-for="(seg, idx) in getHighlightSegments(result.sectionTag, keyword)" :key="`m1-${idx}`">
                <span v-if="seg.highlight" class="result-title-highlight">{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
              </span>
            </span>
            <span class="meta-source" :class="result.sourceType">{{ result.sourceType === 'wine' ? '酒' : '酒庄' }}</span>
            <span class="meta-sub">
              <span v-for="(seg, idx) in getHighlightSegments(result.groupName, keyword)" :key="`m2-${idx}`">
                <span v-if="seg.highlight" class="result-title-highlight">{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
              </span>
            </span>
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

      <div v-else-if="!pageLoading" class="empty-state">
        <p>未找到匹配的内容，可以尝试更换关键词。</p>
      </div>

      <div class="pagination-wrapper" v-if="hasResults && totalResults > pageSize">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="totalResults"
          layout="prev, pager, next"
          background
          @current-change="handlePageChange"
        />
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
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fef7f9 0%, #fce7ec 100%);
  box-shadow: 0 10px 30px rgba(148, 163, 184, 0.2);
}

.search-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-back-btn {
  flex: 0 0 auto;
  border-color: rgba(168, 22, 60, 0.25);
  color: #a8163c;
}

.search-back-btn__icon {
  margin-right: 4px;
}

.search-toolbar-input {
  flex: 1 1 220px;
  min-width: 0;
}

.search-toolbar-submit {
  flex: 0 0 auto;
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
  background: #fce7ec;
  color: #b6193e;
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
  background: #e99539;
  color: #fff;
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
  color: #c92a52;
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
  background: #fce7ec;
  color: #b6193e;
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

  .search-toolbar {
    gap: 8px;
  }

  .search-toolbar-submit {
    width: 100%;
  }
}

@media (min-width: 1025px) {
  .search-results-page {
    width: min(84%, 1280px);
    margin: 32px auto 72px;
    gap: 24px;
  }

  .search-header {
    padding: 16px 18px;
    gap: 12px;
    border-radius: 14px;
  }

  .search-title h1 {
    font-size: 26px;
  }

  .search-title p {
    font-size: 14px;
  }

  .results-list {
    gap: 12px;
  }

  .result-card {
    padding: 16px 18px;
    border-radius: 12px;
    gap: 8px;
  }
}
</style>
