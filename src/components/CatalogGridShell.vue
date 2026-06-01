<script setup>
import { ref } from 'vue'
import WineSubNav from '@/components/WineSubNav.vue'

defineProps({
  variant: {
    type: String,
    default: 'wine'
  },
  subNavItems: {
    type: Array,
    default: () => []
  },
  activeSubNav: {
    type: String,
    default: ''
  },
  subNavDisabledMap: {
    type: Object,
    default: () => ({})
  },
  showGrid: {
    type: Boolean,
    default: true
  },
  showEmpty: {
    type: Boolean,
    default: true
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  showPagination: {
    type: Boolean,
    default: false
  },
  scrollPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  /** 为 true 时 grid-toolbar 在子导航上方（默认在下方） */
  toolbarBeforeSubNav: {
    type: Boolean,
    default: false
  }
})

defineEmits(['sub-nav-select'])

const gridRef = ref(null)
const loadMoreTriggerRef = ref(null)

defineExpose({
  getGridEl: () => gridRef.value,
  getLoadMoreEl: () => loadMoreTriggerRef.value
})
</script>

<template>
  <div class="wine-filter-bar-wrap center">
    <div class="wine-filter-bar">
      <slot name="filter" />
    </div>
  </div>

  <div v-if="$slots['grid-toolbar'] && toolbarBeforeSubNav" class="catalog-grid-toolbar catalog-grid-toolbar--first center">
    <slot name="grid-toolbar" />
  </div>

  <WineSubNav
    :items="subNavItems"
    :active-item="activeSubNav"
    :disabled-map="subNavDisabledMap"
    @select="$emit('sub-nav-select', $event)"
  />

  <div v-if="$slots['grid-toolbar'] && !toolbarBeforeSubNav" class="catalog-grid-toolbar center">
    <slot name="grid-toolbar" />
  </div>

  <template v-if="showGrid">
    <div
      ref="gridRef"
      class="info-list"
      :class="`info-list--${variant}`"
    >
      <slot name="leading" />
      <slot name="items" />
    </div>
    <div v-if="hasMore" ref="loadMoreTriggerRef" class="load-more-trigger" aria-hidden="true"></div>
  </template>
  <div v-else-if="showEmpty" class="wine-grid-empty-wrap center">
    <slot name="empty" />
  </div>

  <div v-if="showPagination" class="pagination-section pagination-section--scenic center">
    <div class="custom-pagination custom-pagination--fixed">
      <div class="page-indicator fs16">
        第 <span class="page-num fowe7">{{ scrollPage }}</span> / {{ totalPages }} 页
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/styles/catalogGridShell.scss';
</style>
