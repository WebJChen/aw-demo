<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  activeItem: {
    type: String,
    default: ''
  },
  disabledMap: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['select'])

const handleClick = (item) => {
  if (props.disabledMap?.[item]) return
  emit('select', item)
}
</script>

<template>
  <div class="subnav-box center">
    <ul class="subnav-list">
      <li
        v-for="(subItem, idx) in items"
        :key="idx"
        class="subnav-item w100"
        :class="{ active: activeItem === subItem, disabled: disabledMap[subItem] }"
        @click="handleClick(subItem)"
      >
        {{ subItem }}
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.subnav-box {
  width: 90%;
  padding: 0 20px;
  margin-top: 14px;

  .subnav-list {
    display: flex;
    justify-content: space-between;
    margin: 0;
    padding: 0;
    gap: 12px;

    .subnav-item {
      cursor: pointer;
      padding: 10px 16px;
      border-radius: 8px;
      background: linear-gradient(180deg, #ffffff 0%, #fce7ec 100%);
      color: #c92a52;
      transition: all 0.2s ease;
      white-space: nowrap;
      user-select: none;
    }

    .subnav-item.disabled {
      background: #f3f4f6;
      color: #9ca3af;
      border-color: #e5e7eb;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .subnav-item.active {
      background: linear-gradient(180deg, #c92a52 0%, #a8163c 100%);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 6px 16px rgba(168, 22, 60, 0.26);
    }
  }
}

@media (min-width: 1025px) {
  .subnav-box {
    width: min(86%, 1400px);
    margin-top: 12px;

    .subnav-list {
      .subnav-item {
        font-size: var(--aw-font-16);
      }
    }
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .subnav-box {
    .subnav-list {
      width: 95%;
      flex: 10px;
    }
  }
}

@media (max-width: 768px) {
  .subnav-box {
    flex-direction: column;
    padding: 0;

    .subnav-list {
      display: grid;
      width: 100%;
      gap: 10px;
      grid-template-columns: repeat(1, 1fr);
    }
  }
}

@media (max-width: 375px) {
  .subnav-box {
    .subnav-list {
      gap: 0;
    }
  }
}
</style>
