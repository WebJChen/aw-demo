<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialogStore } from '@/stores/dialogStore'
import { useUserStore } from '@/stores/userStore'
import { isApiEnabled } from '@/utils/auswineApi'
import { Z_INDEX } from '@/constants/zIndex'

const dialogStore = useDialogStore()
const userStore = useUserStore()
const submitting = ref(false)
const mode = ref('login')

const form = reactive({
  username: '',
  password: '',
  displayName: '',
  email: '',
})

const closeDialog = () => dialogStore.closeDialog('loginPrompt')

const resetForm = () => {
  form.username = ''
  form.password = ''
  form.displayName = ''
  form.email = ''
}

const handleDemoLogin = () => {
  userStore.loginDemo()
  ElMessage.success('已为模拟登录（本地演示）')
  closeDialog()
}

const handleSubmit = async () => {
  const username = String(form.username || '').trim()
  const password = String(form.password || '')
  if (!username || !password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  submitting.value = true
  try {
    if (mode.value === 'register') {
      await userStore.register({
        username,
        password,
        displayName: String(form.displayName || '').trim() || username,
        email: String(form.email || '').trim(),
      })
      ElMessage.success('注册并登录成功')
    } else {
      await userStore.login(username, password)
      ElMessage.success('登录成功')
    }
    resetForm()
    closeDialog()
  } catch (error) {
    ElMessage.error(error?.message || '登录失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogStore.dialogs.loginPrompt.show"
    :title="isApiEnabled() ? (mode === 'register' ? '注册账号' : '账号登录') : '登录提示'"
    width="460px"
    align-center
    append-to-body
    :close-on-click-modal="false"
    :z-index="Z_INDEX.dialog.base"
  >
    <div v-if="!isApiEnabled()" class="login-prompt-body">
      目前暂未登录，点击登录后将直接切换到登录状态。
    </div>
    <div v-else class="login-prompt-body">
      <el-form label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="form.username" autocomplete="username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password autocomplete="current-password" />
        </el-form-item>
        <template v-if="mode === 'register'">
          <el-form-item label="显示名称（可选）">
            <el-input v-model="form.displayName" />
          </el-form-item>
          <el-form-item label="邮箱（可选）">
            <el-input v-model="form.email" />
          </el-form-item>
        </template>
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <template v-if="isApiEnabled()">
          <el-button text @click="mode = mode === 'register' ? 'login' : 'register'">
            {{ mode === 'register' ? '已有账号，去登录' : '没有账号，去注册' }}
          </el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ mode === 'register' ? '注册' : '登录' }}
          </el-button>
        </template>
        <el-button v-else type="primary" @click="handleDemoLogin">登录</el-button>
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
