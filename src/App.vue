<script setup>
import ElevatorNav from '@/components/ElevatorNav.vue'
import ComingSoonDialog from './components/dialogs/ComingSoonDialog.vue';
import AboutUsDialog from './components/dialogs/AboutUsDialog.vue';
import JoinUsDialog from './components/dialogs/JoinUsDialog.vue';
import ContactUsDialog from './components/dialogs/ContactUsDialog.vue';

</script>

<template>
  <RouterView />
  <ElevatorNav />
  <ComingSoonDialog />
  <AboutUsDialog />
  <JoinUsDialog />
  <ContactUsDialog />
</template>

<style scoped lang="scss">
#app {
  height: 2400px;
  // background-color: #39c5bb;
}
</style>