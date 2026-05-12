<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { ArrowLeft, CircleCheckFilled, CircleCloseFilled, WarningFilled } from '@element-plus/icons-vue'
import { useCartStore } from '@/stores/cartStore'
import defaultImg from '@/assets/img/default.png'
import { resolveDataImage } from '@/utils/dataImageResolver'

const router = useRouter()
const cartStore = useCartStore()
const { selectedItems, selectedQuantity, selectedAmount } = storeToRefs(cartStore)

const checkoutFormRef = ref(null)
const submitLoading = ref(false)
const paymentResult = ref(null)

const orderNo = ref(`AW${Date.now()}`)

const form = reactive({
  contactName: '',
  phone: '',
  email: '',
  address: '',
  payMethod: 'card',
  scenario: 'success',
  remark: ''
})

const scenarioMap = {
  success: { status: 'success', title: '支付成功', desc: '订单已支付成功。' },
  fail: { status: 'fail', title: '支付失败', desc: '支付未完成，请检查支付信息后重试。' },
  timeout: { status: 'timeout', title: '请求超时', desc: '支付请求超时，建议检查网络后重新发起支付。' }
}

const payMethods = [
  { label: '银行卡', value: 'card' },
  { label: '微信支付', value: 'wechat' },
  { label: '支付宝', value: 'alipay' }
]

const payScenarios = [
  { label: '模拟成功', value: 'success' },
  { label: '支付失败', value: 'fail' },
  { label: '请求超时', value: 'timeout' }
]

const totalItems = computed(() => selectedItems.value.length)
const canSubmit = computed(() => selectedQuantity.value > 0 && !submitLoading.value)
const resultIconMap = {
  success: CircleCheckFilled,
  fail: CircleCloseFilled,
  timeout: WarningFilled
}

const rules = {
  contactName: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  address: [{ required: true, message: '请输入收货地址', trigger: 'blur' }],
  payMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }]
}

const resetResult = () => {
  paymentResult.value = null
}

const goBackCart = () => {
  router.push({ name: 'Cart' })
}

const backButtonProps = {
  icon: ArrowLeft
}

const submitCheckout = async () => {
  if (!selectedQuantity.value) {
    ElMessage.warning('请先勾选要结算的商品')
    return
  }

  const valid = await checkoutFormRef.value?.validate?.().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  await new Promise((resolve) => setTimeout(resolve, 900))

  const result = scenarioMap[form.scenario] || scenarioMap.success
  paymentResult.value = {
    ...result,
    orderNo: orderNo.value,
    paidAmount: Number(selectedAmount.value || 0).toFixed(2),
    paidQuantity: selectedQuantity.value
  }

  submitLoading.value = false
}

const finishSuccess = () => {
  cartStore.removeSelectedItems()
  ElMessage.success('支付成功，已从购物车移除已结算商品')
  goBackCart()
}

const viewOrderMock = () => {
  ElMessage.info('订单详情页暂未接入，这里为模拟结算流程。')
}

const resolveImageUrl = (img) => resolveDataImage(img, defaultImg, { variant: 'thumb' })
</script>

<template>
  <div class="checkout-page">
    <div class="checkout-header">
      <h1>订单结算</h1>
      <p>请确认信息后完成支付，当前为模拟支付流程。</p>
    </div>

    <div v-if="paymentResult" class="result-panel" :class="paymentResult.status">
      <div class="result-head">
        <el-icon class="result-icon">
          <component :is="resultIconMap[paymentResult.status] || WarningFilled" />
        </el-icon>
        <div class="result-title-wrap">
          <h2>{{ paymentResult.title }}</h2>
          <p>{{ paymentResult.desc }}</p>
        </div>
      </div>
      <div v-if="paymentResult.status === 'success'" class="result-kv">
        <div class="kv-item"><span>订单号</span><strong>{{ paymentResult.orderNo }}</strong></div>
        <div class="kv-item"><span>支付金额</span><strong>¥ {{ paymentResult.paidAmount }}</strong></div>
        <div class="kv-item"><span>支付数量</span><strong>{{ paymentResult.paidQuantity }} 件</strong></div>
      </div>
      <div class="result-actions">
        <el-button v-if="paymentResult.status === 'success'" type="primary" @click="finishSuccess">完成并返回购物车</el-button>
        <el-button v-else type="primary" @click="resetResult">重新支付</el-button>
        <el-button @click="viewOrderMock">查看订单（模拟）</el-button>
        <el-button v-if="paymentResult.status !== 'success'" class="result-back-btn" v-bind="backButtonProps" @click="goBackCart">返回购物车</el-button>
      </div>
    </div>

    <div v-else class="checkout-main">
      <section class="checkout-form-card">
        <el-form ref="checkoutFormRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="联系人" prop="contactName">
            <el-input v-model="form.contactName" placeholder="请输入联系人姓名" />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入手机号/座机" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="用于接收订单通知（选填）" />
          </el-form-item>
          <el-form-item label="收货地址" prop="address">
            <el-input v-model="form.address" type="textarea" :rows="3" placeholder="请输入详细收货地址" />
          </el-form-item>
          <el-form-item label="支付方式" prop="payMethod">
            <el-radio-group v-model="form.payMethod">
              <el-radio v-for="method in payMethods" :key="method.value" :value="method.value">{{ method.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="支付场景模拟">
            <el-select v-model="form.scenario">
              <el-option v-for="scenario in payScenarios" :key="scenario.value" :label="scenario.label" :value="scenario.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" placeholder="备注信息（选填）" />
          </el-form-item>
        </el-form>

      </section>

      <aside class="checkout-summary">
        <h3>订单摘要</h3>
        <div class="paying-items paying-items--summary">
          <h4>正在支付商品</h4>
          <div v-for="item in selectedItems" :key="item.cartId" class="paying-item">
            <el-image :src="resolveImageUrl(item.img)" :alt="item.title" class="paying-thumb" fit="cover" />
            <span class="paying-title" :title="item.title">{{ item.title }}</span>
          </div>
        </div>
        <div class="summary-row"><span>已选商品种类</span><strong>{{ totalItems }}</strong></div>
        <div class="summary-row"><span>已选商品数量</span><strong>{{ selectedQuantity }} 件</strong></div>
        <div class="summary-row total"><span>应付总价</span><strong>¥ {{ Number(selectedAmount).toFixed(2) }}</strong></div>
        <el-button type="primary" :loading="submitLoading" :disabled="!canSubmit" class="submit-btn" @click="submitCheckout">
          {{ submitLoading ? '提交中...' : '去支付（模拟）' }}
        </el-button>
        <el-button text class="summary-back-btn" v-bind="backButtonProps" @click="goBackCart">返回购物车</el-button>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.checkout-page { width: min(96%, 1200px); margin: 26px auto 40px; display: flex; flex-direction: column; gap: 16px; }
.checkout-header { background: #fff; border: 1px solid #e5e7eb; padding: 16px 20px; }
.checkout-header h1 { margin: 0; font-size: 28px; }
.checkout-header p { margin: 6px 0 0; color: #64748b; }
.checkout-main { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
.checkout-form-card { background: #fff; border: 1px solid #e5e7eb; padding: 16px; }
.checkout-summary { background: #fff; border: 1px solid #e5e7eb; padding: 16px; height: fit-content; }
.checkout-summary h3 { margin: 0 0 12px; font-size: 20px; }
.paying-items--summary { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eef2f7; }
.paying-items--summary h4 { margin: 0 0 10px; font-size: 15px; color: #334155; }
.paying-item { display: grid; grid-template-columns: 42px 1fr; gap: 10px; align-items: center; padding: 6px 0; }
.paying-thumb { width: 42px; height: 42px; border-radius: 2px; display: block; }
.paying-title { color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; color: #475569; }
.summary-row.total strong { color: #1f6f66; font-size: 20px; }
.submit-btn { width: 100%; margin-top: 8px; }
.summary-back-btn { margin-left: auto; display: inline-flex; }
.result-panel { background: #fff; border: 1px solid #e5e7eb; padding: 22px; }
.result-panel.success { border-left: 4px solid #16a34a; }
.result-panel.fail { border-left: 4px solid #dc2626; }
.result-panel.timeout { border-left: 4px solid #f59e0b; }
.result-head { display: flex; gap: 12px; align-items: flex-start; }
.result-icon { font-size: 30px; margin-top: 2px; }
.result-panel.success .result-icon { color: #16a34a; }
.result-panel.fail .result-icon { color: #dc2626; }
.result-panel.timeout .result-icon { color: #f59e0b; }
.result-title-wrap h2 { margin: 0 0 6px; }
.result-title-wrap p { margin: 0; color: #64748b; }
.result-kv { margin-top: 14px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; display: grid; gap: 8px; }
.kv-item { display: flex; justify-content: space-between; gap: 12px; }
.kv-item span { color: #64748b; }
.kv-item strong { color: #111827; font-weight: 600; }
.result-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.result-back-btn { margin-left: auto; }

@media (min-width: 769px) and (max-width: 1024px) {
  .checkout-page { width: 94%; margin-top: 18px; }
  .checkout-main { grid-template-columns: 1fr 300px; }
  .checkout-form-card, .checkout-summary { padding: 14px; }
  .result-panel { padding: 18px; }
}

@media (max-width: 768px) {
  .checkout-main { grid-template-columns: 1fr; }
  .checkout-page { width: 96%; margin-top: 12px; }
  .checkout-header { padding: 14px; }
  .checkout-header h1 { font-size: 24px; }
  .checkout-form-card, .checkout-summary { padding: 12px; }
  .result-panel { padding: 14px; }
  .result-head { gap: 10px; }
  .result-icon { font-size: 24px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-back-btn { margin-left: 0; }
  .summary-back-btn { margin-left: 0; align-self: flex-end; }
  .paying-item { grid-template-columns: 36px 1fr; }
  .paying-thumb { width: 36px; height: 36px; }
}
</style>
