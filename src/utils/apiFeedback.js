import { ElMessage } from 'element-plus'
import { ApiError } from '@/utils/auswineApi'

export function showApiError(error, fallback = '操作失败，请稍后再试') {
  const message = error instanceof ApiError
    ? error.message
    : (error?.message || fallback)
  ElMessage.error(message || fallback)
}

export function showApiSuccess(message) {
  if (message) ElMessage.success(message)
}
