<script setup>
import { useDialogStore } from '@/stores/dialogStore';
import { Z_INDEX } from '@/constants/zIndex'

const dialogStore = useDialogStore()

const closeDialog = () => dialogStore.closeDialog('comingSoon')
</script>

<template>
  <el-dialog v-model="dialogStore.dialogs.comingSoon.show" title="提示" width="500" align-center
    :append-to-body="true" :z-index="Z_INDEX.dialog.base">
    <span>正在开发中，敬请期待！</span>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="closeDialog">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped></style>
