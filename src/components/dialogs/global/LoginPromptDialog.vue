<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock, Message, Star, Monitor } from '@element-plus/icons-vue'
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

const isLoggedIn = computed(() => userStore.loggedIn)
const loggedInLabel = computed(() => userStore.displayName || userStore.username || userStore.userId || '')
const userInitial = computed(() => {
  const name = String(loggedInLabel.value || 'U')
  return name.charAt(0).toUpperCase()
})

const dialogTitle = computed(() => {
  if (isLoggedIn.value) return '账号信息'
  return mode.value === 'register' ? '注册新账号' : '用户登录'
})

const dialogSubtitle = computed(() => {
  if (isLoggedIn.value) return ''
  return mode.value === 'register'
    ? '创建账号后即可同步购物车与订单'
    : '登录后可同步购物车、订单与会话状态'
})

const closeDialog = () => dialogStore.closeDialog('loginPrompt')

const resetForm = () => {
  form.username = ''
  form.password = ''
  form.displayName = ''
  form.email = ''
}

watch(() => dialogStore.dialogs.loginPrompt.show, (visible) => {
  if (!visible) {
    mode.value = 'login'
    resetForm()
  }
})

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
    :title="dialogTitle"
    width="520px"
    align-center
    append-to-body
    :close-on-click-modal="false"
    :z-index="Z_INDEX.dialog.base"
    class="login-dialog"
  >
    <template #header>
      <div class="login-dialog-header">
        <span class="login-dialog-title">{{ dialogTitle }}</span>
        <span v-if="dialogSubtitle" class="login-dialog-subtitle">{{ dialogSubtitle }}</span>
      </div>
    </template>

    <div class="login-prompt-body">
      <div v-if="isLoggedIn" class="user-card">
        <div class="user-avatar">{{ userInitial }}</div>
        <div class="user-meta">
          <div class="user-name">{{ loggedInLabel }}</div>
          <div class="user-status">已登录 · 购物车与订单已接入后端</div>
        </div>
      </div>

      <div v-else class="auth-mode-switch">
        <button type="button" class="auth-mode-btn" :class="{ active: mode === 'login' }" @click="mode = 'login'">
          登录
        </button>
        <button type="button" class="auth-mode-btn" :class="{ active: mode === 'register' }" @click="mode = 'register'">
          注册
        </button>
      </div>

      <el-form v-if="!isLoggedIn" label-position="top" class="login-form">
        <el-form-item label="用户名">
          <el-input v-model="form.username" autocomplete="username" size="large" :prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password autocomplete="current-password" size="large" :prefix-icon="Lock" />
        </el-form-item>
        <template v-if="mode === 'register'">
          <el-form-item label="显示名称（可选）">
            <el-input v-model="form.displayName" size="large" :prefix-icon="User" />
          </el-form-item>
          <el-form-item label="邮箱（可选）">
            <el-input v-model="form.email" size="large" :prefix-icon="Message" />
          </el-form-item>
        </template>
      </el-form>

      <div v-if="!isLoggedIn" class="login-tips">
        <span class="tip-dot"></span>
        <span v-if="mode === 'register'">注册成功后将自动登录，并同步云端购物车</span>
        <span v-else>已有账号可直接登录，登录后再提交订单</span>
      </div>

      <div v-else class="benefit-list">
        <div class="benefit-item">
          <el-icon><Star /></el-icon>
          <span>收藏与购物车可继续同步到后端</span>
        </div>
        <div class="benefit-item">
          <el-icon><Monitor /></el-icon>
          <span>换设备登录后仍可继续查看订单</span>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="login-dialog-footer">
        <el-button v-if="!isLoggedIn" type="primary" :loading="submitting" @click="handleSubmit">
          {{ mode === 'register' ? '注册并登录' : '登录' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.login-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login-dialog-title {
  font-weight: 700;
  letter-spacing: 2px;
  color: #a8163c;
  font-size: 18px;
  line-height: 1.3;
}

.login-dialog-subtitle {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.login-prompt-body {
  color: #334155;
  line-height: 1.8;
}

.auth-mode-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  padding: 4px;
  border-radius: 8px;
  background: #f3f4f6;
}

.auth-mode-btn {
  flex: 1;
  border: none;
  background: transparent;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    color: #fff;
    background: linear-gradient(135deg, #c92a52 0%, #a8163c 100%);
    box-shadow: 0 4px 12px rgba(168, 22, 60, 0.24);
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    color: #555;
    font-weight: 500;
    padding-bottom: 4px;
  }

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 0 0 1px #e5e7eb inset;
    transition: box-shadow 0.2s ease;
  }

  :deep(.el-input__wrapper:hover) {
    box-shadow: 0 0 0 1px rgba(201, 42, 82, 0.45) inset;
  }

  :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #c92a52 inset !important;
  }

  :deep(.el-input__prefix .el-icon) {
    color: #c92a52;
  }
}

.login-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

.tip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c92a52;
  flex-shrink: 0;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 12px;
  background: #fafafa;
  border-left: 4px solid #c92a52;
  margin-bottom: 16px;
}

.user-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #c92a52 0%, #a8163c 100%);
  box-shadow: 0 6px 16px rgba(201, 42, 82, 0.28);
  flex-shrink: 0;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #222;
  line-height: 1.3;
  word-break: break-all;
}

.user-status {
  margin-top: 4px;
  font-size: 13px;
  color: #888;
}

.benefit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  font-size: 13px;
  color: #666;
  line-height: 1.55;

  .el-icon {
    margin-top: 2px;
    font-size: 16px;
    color: #c92a52;
    flex-shrink: 0;
  }
}

.login-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
