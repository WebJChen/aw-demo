<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import ServiceNav from '@/components/ServiceNav.vue'
import { useLoadingStore } from '@/stores/loadingStore'

const route = useRoute()
const loadingStore = useLoadingStore()
const { fullscreenLoading } = storeToRefs(loadingStore)
const loadingState = computed(() => fullscreenLoading.value)

/** 支付成功快照页（与 OrderDetail `snapshot=1`、`DefaultLayout` 一致）：隐藏中部服务导航条 */
const hideServiceNavForPaySnapshot = computed(
  () => route.name === 'OrderDetail' && route.query.snapshot === '1'
)
</script>

<template>
  <div>
    <ServiceNav v-if="!hideServiceNavForPaySnapshot" />
    <div v-loading.fullscreen="loadingState" element-loading-spinner-color="#a8163c"
      element-loading-background="rgba(255, 255, 255, 0.8)"></div>
    <div class="content-box" :class="{ 'content-box--snapshot-order': hideServiceNavForPaySnapshot }">
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
  // margin-top: 35px;
}

.content-box--snapshot-order {
  margin-top: 12px;
  width: 100%;
  box-sizing: border-box;
  padding-left: clamp(16px, 4vw, 40px);
  padding-right: clamp(16px, 4vw, 40px);
  align-items: center;
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
    // padding-top: 20px;
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