<script setup>
import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '@/stores/deviceStore'
import { useDialogStore } from '@/stores/dialogStore'

const deviceStore = useDeviceStore()
const { isMobile } = storeToRefs(deviceStore)
const dialogStore = useDialogStore()

onMounted(() => {
  deviceStore.startListen()
})

onUnmounted(() => {
  deviceStore.stopListen()
})

const closeDialog = () => dialogStore.closeDialog('contactUs')
</script>

<template>
  <el-dialog v-model="dialogStore.dialogs.contactUs.show" title="咨询方式" :close-on-click-modal="true" align-center
    class="contact-dialog" :z-index="9800" :fullscreen="isMobile" :append-to-body="true">
    <div class="consultation-content">
      <div class="consultation-item">
        <i class="contact-icon phone-icon"></i>
        <div class="contact-details">
          <div class="contact-label">电话咨询</div>
          <div class="contact-value">(+61)0488 388 188</div>
        </div>
      </div>
      <div class="consultation-item">
        <i class="contact-icon email-icon"></i>
        <div class="contact-details">
          <div class="contact-label">邮件咨询</div>
          <div class="contact-value">tto.advisory@gmail.com</div>
        </div>
      </div>
      <div class="consultation-item">
        <i class="contact-icon wechat-icon"></i>
        <div class="contact-details">
          <div class="contact-label">微信咨询</div>
          <div class="contact-value">微信号：TasmaniaTrips</div>
          <div class="contact-note">欢迎加微咨询（输入微信号“TasmaniaTrips”进行搜索）</div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" style="text-align: right;" @click="closeDialog">确定</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
// :deep(.el-dialog) {
.consultation-content .consultation-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.consultation-content .consultation-item:last-child {
  border-bottom: none;
}

.contact-icon {
  width: 20px;
  height: 20px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.contact-icon.phone-icon {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2333b1a3'%3E%3Cpath d='M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z'/%3E%3C/svg%3E");
}

.contact-icon.email-icon {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2333b1a3'%3E%3Cpath d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z'/%3E%3C/svg%3E");
}

.contact-icon.wechat-icon {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2333b1a3'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/%3E%3C/svg%3E");
}

.contact-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.contact-value {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.contact-note {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
</style>
