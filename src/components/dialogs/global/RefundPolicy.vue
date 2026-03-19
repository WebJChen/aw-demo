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

const closeDialog = () => dialogStore.closeDialog('refundPolicy')
</script>

<template>
  <!-- <div> -->
  <el-dialog v-model="dialogStore.dialogs.refundPolicy.show" title="TasTrips.Online退款政策" width="800" max-width="500px" :fullscreen="isPhone"
    align-center center :z-index=9500>
    <div class="policy-text">
      <div class="policy-section">
        <h2>第一章 总则</h2>
        <ul>
          <li class="policy-paragraph">1.1 TasTrips.Online始终致力于为客户提供最优质的旅行体验。</li>
          <li class="policy-paragraph">1.2 本协议旨在明确预订取消、行程变更等情况下的退款标准，保障客户权益的同时确保服务资源的合理配置。</li>
        </ul>
      </div>

      <div class="policy-section">
        <h2>第二章 取消与退款标准</h2>

        <h3>2.1 常规行程取消</h3>
        <el-table class="refund-table" border :data="[
          { timeRange: '距出发日30天以上取消', refundRate: '全额退款' },
          { timeRange: '距出发日15-29天取消', refundRate: '退款80%' },
          { timeRange: '距出发日7-14天取消', refundRate: '退款50%' },
          { timeRange: '距出发日3-6天取消', refundRate: '退款30%' },
          { timeRange: '出发前72小时内取消', refundRate: '恕不退款' }
        ]">
          <el-table-column prop="timeRange" label="取消时间" width="180" align="center" />
          <el-table-column prop="refundRate" label="退款比例" align="center" />
        </el-table>

        <h3>2.2 特色项目特别规定</h3>
        <ul>
          <li class="policy-paragraph">极光观测、私人包车等需提前锁定资源项目，距体验日14天以上取消可获90%退款</li>
          <li class="policy-paragraph">7-14天取消，退款60%</li>
          <li class="policy-paragraph">7天内取消，恕不退款</li>
        </ul>

        <h3>2.3 不可抗力处理</h3>
        <ul>
          <li class="policy-paragraph">如遇自然灾害、政府管制等不可抗力因素：</li>
          <li class="policy-paragraph">可选择改期至12个月内任意时间</li>
          <li class="policy-paragraph">或获得85%款项退还（15%用于已产生的行政及资源预定成本）</li>
        </ul>
      </div>

      <div class="policy-section">
        <h2>第三章 退款申请流程</h2>

        <h3>3.1 申请渠道</h3>
        <ul>
          <!-- <li class="policy-paragraph">官网会员中心在线提交</li> -->
          <li class="policy-paragraph">联系电话：0431 888 888</li>
          <li class="policy-paragraph">咨询邮箱：tto.advisory@gmail.com</li>
          <li class="policy-paragraph">官方微信公众号：TasTrips.Online</li>
        </ul>

        <h3>3.2 所需材料</h3>
        <ul>
          <li class="policy-paragraph">预订确认函</li>
          <li class="policy-paragraph">付款凭证</li>
          <li class="policy-paragraph">取消原因说明</li>
        </ul>

        <h3>3.3 处理时效</h3>
        <ul>
          <li class="policy-paragraph">收到申请后2个工作日内确认</li>
          <li class="policy-paragraph">确认后7-10个工作日内完成退款</li>
          <li class="policy-paragraph">旺季可能延长至15个工作日</li>
        </ul>
      </div>

      <div class="policy-section">
        <h2>第四章 特殊情形说明</h2>

        <h3>4.1 服务质量保障</h3>
        <ul>
          <li class="policy-paragraph">若实际服务与承诺严重不符：</li>
          <li class="policy-paragraph">经核实后，按差异程度提供30%-100%补偿</li>
          <li class="policy-paragraph">需在服务结束24小时内提交书面说明及证据</li>
        </ul>

        <h3>4.2 行程调整</h3>
        <ul>
          <li class="policy-paragraph">行程开始前可免费修改1次</li>
          <li class="policy-paragraph">后续每次修改收取5%服务费</li>
          <li class="policy-paragraph">开始后恕不接受行程变更</li>
        </ul>
      </div>

      <div class="policy-section">
        <h2>第五章 附则</h2>
        <ul>
          <li class="policy-paragraph">5.1 本协议最终解释权归TasTrips.Online所有</li>
          <li class="policy-paragraph">5.2 协议更新将于官网公示7天后生效</li>
          <!-- <li class="policy-paragraph">5.3 争议协商不成可提交塔斯马尼亚旅游仲裁委员会解决</li> -->
        </ul>
      </div>

      <div class="tips">
        <div class="policy-info">温馨提示：
          我们理解行程变化可能给你带来的困扰。建议你根据自身情况购买行程取消险，以获得更全面的保障。TasTrips.Online始终竭诚为你提供咨询与协助。</div>
      </div>

      <div class="contact-info">
        【如需进一步了解退款细则，请联系tto.advisory@gmail.com，或点击”联系我们“获取更多帮助】
        <br>
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
  <!-- </div> -->
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

// 平板设备适配 (768px - 1024px)
@media (min-width: 769px) and (max-width: 1024px) {
  .policy-text {
    height: 600px;
    font-size: 15px;
  }
}

// 手机设备适配 (小于768px)
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

// 小屏幕手机适配 (小于480px)
@media (max-width: 480px) {
  .tips {
    padding: 8px;
  }
}
</style>
