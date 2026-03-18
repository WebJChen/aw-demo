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

const closeDialog = () => dialogStore.closeDialog('aboutUs')
</script>

<template>
  <el-dialog v-model="dialogStore.dialogs.aboutUs.show" title="关于我们" align-center :width="isMobile ? '100%' : '60%'"
    :append-to-body="true" :lock-scroll="true">
    <div class="about-us-content">
      <p class="about-text">
        塔斯马尼亚旅行有限公司(TASMANIA TRIPS
        PTY
        LTD)是一家专注于塔斯马尼亚地区旅游服务的公司(公司网站:TasTrips.Online)。我们致力于为客人提供专业、贴心的旅行服务，让阁下与家人、朋友在塔斯马尼亚旅行期间的行程能够衔接顺利、安全有保障，确保整个旅行丝滑进行。
      </p>
      <p class="about-text">
        我们有七项主营业务，包括:「一日游/多日游、预定活动项目或景点门票、包车服务、私人订制行程规划、地接地陪、行程管家」。我们深知每一位旅行者都有自己的旅行喜好和需要，因此我们根据客人的反馈打造了七项服务和一项参考信息，相信总有一项能够切合客人的需求。
      </p>
      <p class="about-text">
        有感客人基本是远道而来，当中大多数人对本地情况不会了解很深，本公司特意在网站中设立了一个「自助游/自驾游免费参考信息」的专页，里面尽可能详细地列举、介绍了一些本地的基本信息，我们希望(相信)该专页能够一定程度上帮助大家了解需要的信息以免浪费行程中的宝贵时间。
      </p>
      <p class="about-text">
        我们尽可能将「服务项目、服务标准、收费标准、付款与退款、取消预定」等的相关规定公开化、透明化，意在向公众明确本公司实行的标准和执行的规定皆是公开透明，不存在灰色地带，表明本公司没有打算模糊概念或存在任何形式的隐形收费。
      </p>
      <p class="about-text">
        我们决意打造期长期品牌与口碑。公司的发展可以走得慢，但一定要走得稳。品牌建立不易，好口碑也绝不是投点广告、发几篇词藻精美的文章或拍摄与剪辑技巧炫酷的视频就可以建立，必是经过长时间对服务质量的坚持与对旅行的深刻思考和理解方能达到。我们愿意以此为目标，以塔斯马尼亚为起点，建立品牌与口碑，图谋以后更大的舞台，因此，我们弃绝急功近利的短期行为而专注于长期的优质服务与口碑建设。
      </p>
      <p class="about-text">
        欲稳须慢，慢即是快。
      </p>
      <p class="about-text about-ending">
        ——创始人寄语
      </p>
      <!-- <p class="about-slogan">
                诚会天下游者，祝你旅途愉快！
            </p> -->
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
.about-us-content {
  text-align: justify;
  line-height: 2;
  // color: #333;

  .about-text {
    margin-bottom: 16px;
    text-indent: 2em;
    font-size: 15px;

    &:last-of-type {
      margin-bottom: 20px;
    }
  }

  .about-ending {
    text-align: right;
  }

  .about-slogan {
    text-align: center;
    margin-top: 24px;
    font-weight: bold;
    color: #33b1a3;
    font-size: 16px;
  }
}
</style>
