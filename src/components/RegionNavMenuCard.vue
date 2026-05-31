<script setup>
defineProps({
  navMenuItems: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select'])

const handleSelect = (menuItem) => {
  emit('select', menuItem)
}
</script>

<template>
  <div class="info-item info-item--nav-menu" aria-label="八州酒庄导航">
    <header class="nav-menu-header">
      <p class="nav-menu-header-title">八州酒庄</p>
      <p class="nav-menu-header-sub">点州名 · 查看该州酒庄</p>
    </header>
    <ul class="nav-menu-list">
      <li v-for="menuItem in navMenuItems" :key="menuItem.navName" class="nav-menu-row">
        <span class="nav-menu-name">
          <span class="nav-menu-wine-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path
                d="M7 3h10v2c0 3.87-2.13 6.82-5 7.74V18h3v2H9v-2h3v-5.26C9.13 11.82 7 8.87 7 5V3z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span class="nav-menu-name-text pointer" @click.stop="handleSelect(menuItem)">
            {{ menuItem.navName }}{{ menuItem.capitalLabel }}
          </span>
        </span>
        <span class="nav-menu-arrow" aria-hidden="true">›</span>
      </li>
    </ul>
  </div>
</template>
