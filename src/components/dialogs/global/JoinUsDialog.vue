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

const closeDialog = () => dialogStore.closeDialog('joinUs')
</script>

<template>
  <el-dialog v-model="dialogStore.dialogs.joinUs.show" :append-to-body="true" align-center width="520px"
    class="join-us-dialog" @close="closeDialog">
    <template #header>
      <div style="font-weight:700; letter-spacing:2px; color:#33b1a3;">加入我们</div>
    </template>
    <div class="join-us-modal">
      <div class="join-us-modal-info">
        TasTrips诚聘导游与司机
      </div>
    </div>
    <template #footer>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <el-button type="primary" @click="closeDialog">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss"></style>
