<script setup>
import ElevatorNav from '@/components/ElevatorNav.vue'
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

</script>

<template>
  <RouterView />
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