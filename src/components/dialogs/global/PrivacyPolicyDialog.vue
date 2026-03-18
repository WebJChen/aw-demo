<script setup>
import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDialogStore } from '@/stores/dialogStore'
import { useDeviceStore } from '@/stores/deviceStore'

const dialogStore = useDialogStore()
const deviceStore = useDeviceStore()
const { isPhone } = storeToRefs(deviceStore)

onMounted(() => {
  deviceStore.startListen()
})

onUnmounted(() => {
  deviceStore.stopListen()
})

const closeDialog = () => dialogStore.closeDialog('privacyPolicy')
</script>

<template>
  <el-dialog v-model="dialogStore.dialogs.privacyPolicy.show" title="AusWine.com隐私保护政策" width="800" max-width="500px"
    :fullscreen="isPhone" align-center center :z-index=9500>
    <div class="policy-text">
      <div class="policy-section">
        <h2>隐私保护承诺</h2>
        <div class="policy-info">AusWine.com深知个人信息的重要性，我们承诺以最严格的标准保护你的隐私权。本政策将清晰说明我们如何收集、使用、存储和保护你的个人信息。</div>
      </div>
      <div class="policy-section">
        <h2>第一章 信息收集范围</h2>
        <ul>
          <li class="policy-paragraph">基础信息：姓名、联系方式、证件信息等必要预订信息</li>
          <li class="policy-paragraph">行程偏好：饮食需求、住宿偏好、活动兴趣等个性化信息</li>
          <li class="policy-paragraph">设备信息：IP地址、浏览器类型、设备型号等用于改善服务质量</li>
        </ul>
      </div>
      <div class="policy-section">
        <h2>第二章 信息使用与共享原则</h2>
        <h3>我们仅出于以下明确、必要的目的处理你的个人信息：</h3>
        <ul>
          <li class="policy-paragraph">用于为你提供行程预订、安排、确认及客户支持等核心旅行服务</li>
          <li class="policy-paragraph">用于履行法定义务、解决争议、执行我们的协议，以及保障交易与账户安全</li>
          <li class="policy-paragraph">在获得你明确同意后，用于发送个性化的旅行建议、优惠信息或用于你指定的其他用途</li>
          <li class="policy-paragraph">为了完成您的预订与服务，我们将在必要范围内将您的信息（如姓名与入住日期）提供给酒店、航司等合作伙伴，所有合作伙伴均受严格的保密协议约束</li>
          <li class="policy-paragraph">我们承诺，绝不会出售你的个人信息。未经你额外同意，我们也不会将你的信息用于与本政策所述目的无关的广告营销</li>
        </ul>
      </div>

      <div class="policy-section">
        <h2>第三章 信息保护与依法披露</h2>
        <h3>我们采取严格措施保护你的信息，并仅在法律要求时进行披露</h3>
        <ul>
          <li class="policy-paragraph">我们采用加密技术、访问控制、安全审计等组织性与技术性措施保护你的个人信息安全</li>
          <li class="policy-paragraph">所有受托处理信息的第三方，均受合同条款及保密协议的严格约束，必须采取同等保护措施，并禁止将信息用于任何其他目的</li>
          <li class="policy-paragraph">我们仅在法律、法规、司法机关或政府主管部门强制性要求的情况下，披露你的必要信息</li>
        </ul>
      </div>
      <div class="policy-section">
        <h2>第四章 你的权利</h2>
        <ul>
          <li class="policy-paragraph">你有权查询我们持有的关于你的个人信息，并要求更新或更正不准确的信息</li>
          <li class="policy-paragraph">在法律法规允许及我们的服务义务完成后，你可以要求删除你的个人信息</li>
          <li class="policy-paragraph">你可以通过客服渠道，随时撤回你已授予我们的信息使用同意，但这不影响撤回前基于同意已进行的信息处理</li>
        </ul>
      </div>

      <div class="policy-section">
        <h2>第五章 Cookie与追踪技术</h2>
        <ul>
          <li class="policy-paragraph">我们使用Cookie提升网站体验</li>
          <li class="policy-paragraph">你可通过浏览器设置管理Cookie偏好</li>
          <li class="policy-paragraph">我们使用数据分析工具改善服务质量</li>
        </ul>
      </div>
      <div class="policy-section">
        <h2>第六章 政策更新</h2>
        <ul>
          <li class="policy-paragraph">本政策可能随服务发展而更新</li>
          <li class="policy-paragraph">重大变更将通过官网公告或邮件通知</li>
          <li class="policy-paragraph">继续使用我们的服务视为接受更新后的政策</li>
        </ul>
      </div>

      <div class="contact-info">
        如对隐私政策有任何疑问，请点击“联系我们”获取更多帮助。<br>
        工作时间：周一至周五 9:00-17:00（塔斯马尼亚时间）；周一至周五 10:00-18:00（中国时间）
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="closeDialog">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.policy-text {
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  text-align: justify;
  padding: 10px 0;
  height: 600px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #dcdfe6 #f5f7fa;
}

.policy-text::-webkit-scrollbar {
  width: 6px;
}

.policy-text::-webkit-scrollbar-track {
  background: #f5f7fa;
  border-radius: 3px;
}

.policy-text::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.policy-text::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

.policy-section {
  margin-bottom: 20px;
}

.policy-section h2 {
  font-size: 16px;
  font-weight: bold;
  margin: 15px 0 10px 0;
  color: #33b1a3;
}

.policy-section h3 {
  font-size: 15px;
  font-weight: bold;
  margin: 12px 0 8px 0;
  color: #333;
}

.policy-paragraph {
  float: none;
  margin-bottom: 8px;
  white-space: pre-wrap;
  list-style-type: disc;
  margin-left: 20px;
}

.policy-info {
  text-indent: 2em;
}

.policy-paragraph,
.policy-info {
  margin-bottom: 8px;
  white-space: pre-wrap;
}

.refund-table {
  margin: 10px 0 20px 0;
  width: 100%;
}

.refund-table th {
  background-color: #fafafa;
}

.dialog-footer {
  text-align: center;
}

.tips {
  background-color: #f0f9ff;
  border-left: 4px solid #33b1a3;
  padding: 10px;
  margin: 15px 0;
  border-radius: 4px;
}

.contact-info {
  text-align: center;
  margin-top: 15px;
  color: #666;
  font-style: italic;
}

@media (min-width: 769px) and (max-width: 1024px) {
  .policy-text {
    height: 600px;
    font-size: 15px;
  }
}

@media (max-width: 768px) {
  .policy-text {
    height: 100%;
    font-size: 13px;
    padding: 5px 0;
  }

  .policy-section h2 {
    font-size: 15px;
    margin: 12px 0 8px 0;
  }

  .policy-section h3 {
    font-size: 14px;
    margin: 10px 0 6px 0;
  }

  .refund-table {
    margin: 8px 0 15px 0;
  }

  .refund-table .el-table__cell {
    padding: 6px 4px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .tips {
    padding: 8px;
  }
}
</style>
