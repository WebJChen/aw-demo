<script setup>
import ElevatorNav from '@/components/ElevatorNav.vue'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useLoadingStore } from '@/stores/loadingStore'
import {
  ComingSoonDialog,
  AboutUsDialog,
  JoinUsDialog,
  ContactUsDialog,
  RefundPolicyDialog,
  DisclaimerDialog,
  PrivacyPolicyDialog,
  TermsandConditionsDialog,
  TipsDialog,
  LoginPromptDialog
} from './components/dialogs/global';

const loadingStore = useLoadingStore()
const { fullscreenLoading, loadingText } = storeToRefs(loadingStore)
const loadingState = computed(() => fullscreenLoading.value)
</script>

<template>
  <RouterView />
  <div v-loading.fullscreen="loadingState" :element-loading-text="loadingText"
    element-loading-spinner-color="#a8163c" element-loading-background="rgba(255, 255, 255, 0.8)"></div>
  <ElevatorNav />
  <ComingSoonDialog />
  <AboutUsDialog />
  <JoinUsDialog />
  <ContactUsDialog />
  <RefundPolicyDialog />
  <DisclaimerDialog />
  <PrivacyPolicyDialog />
  <TermsandConditionsDialog />
  <TipsDialog />
  <LoginPromptDialog />
</template>

<style scoped lang="scss">
#app {
  height: 2400px;
  // background-color: #39c5bb;
}
</style>