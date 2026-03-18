<script setup>
import { useDialogStore } from '@/stores/dialogStore'

const dialogStore = useDialogStore()

const acceptDisclaimer = () => {
  dialogStore.closeDialog('disclaimer')
}
</script>

<template>
  <el-dialog v-model="dialogStore.dialogs.disclaimer.show" align-center width="520px" :close-on-click-modal="false"
    :show-close="false"
    :append-to-body="true" :lock-scroll="true">
    <template #header>
      <div style="font-weight:700; letter-spacing:2px; color:#33b1a3;">免责条款提示</div>
    </template>
    <div style="color:#333; line-height:1.8; text-align:justify;">
      【免责条款】本网站之全部内容，不对任何本网站的使用者（以下简称使用者）构成任何的旅行建议或行程建议。
      使用者因浏览本网站而决定产生的旅行主意或行程主意由使用者自主判断和决定，本网站与其运营公司不对这些决定负任何责任。
    </div>
    <template #footer>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <el-button type="primary" @click="acceptDisclaimer">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss"></style>
