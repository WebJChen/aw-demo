<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia'
import ServiceNav from '@/components/ServiceNav.vue'
import { useLoadingStore } from '@/stores/loadingStore'

const loadingStore = useLoadingStore()
const { fullscreenLoading } = storeToRefs(loadingStore)
const loadingState = computed(() => fullscreenLoading.value)
</script>

<template>
  <div>
    <ServiceNav />
    <div v-loading.fullscreen="loadingState" element-loading-spinner-color="#279486"
      element-loading-background="rgba(255, 255, 255, 0.8)"></div>
    <div class="content-box">
      <RouterView />
    </div>
  </div>
</template>

<style scoped lang="scss">
.content-box {
  display: flex;
  height: auto;
  color: #101010;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 35px;
}

@media (max-width: 768px) {
  .content-box {
    height: auto;
    margin-top: 0;
  }
}

/* 超小屏幕设备适配（iPhone 4、iPhone 5、iPhone SE等，<=375px） */
@media (max-width: 375px) {
  .content-box {
    // height: auto;
    padding-top: 20px;
    gap: 16px;
  }
}

/* 极超小屏幕设备适配（iPhone 4等，<=320px） */
@media (max-width: 320px) {
  .content-box {
    gap: 12px;
  }
}
</style>