<script setup>
import { useDialogStore } from '@/stores/dialogStore'
import { useUserStore } from '@/stores/userStore'
import { Z_INDEX } from '@/constants/zIndex'

const dialogStore = useDialogStore()
const userStore = useUserStore()

const closeDialog = () => dialogStore.closeDialog('loginPrompt')

const handleLogin = () => {
  userStore.loginDemo()
  closeDialog()
}
</script>

<template>
  <el-dialog v-model="dialogStore.dialogs.loginPrompt.show" title="登录提示" width="460px" align-center append-to-body
    :close-on-click-modal="false" :z-index="Z_INDEX.dialog.base">
    <div class="login-prompt-body">
      目前暂未登录，点击登录后将直接切换到登录状态。
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="handleLogin">登录</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.login-prompt-body {
  color: #334155;
  line-height: 1.8;
}
</style>
