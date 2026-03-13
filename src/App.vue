<script setup>
import ElevatorNav from '@/components/ElevatorNav.vue'
import { Teleport } from 'vue';
import ComingSoonDialog from './components/dialogs/ComingSoonDialog.vue';

</script>

<template>
  <RouterView />
  <!-- eslint-disable-next-line vue/no-multiple-template-root -->
  <ElevatorNav />

  <!-- eslint-disable-next-line vue/no-multiple-template-root -->
  <Teleport to="body">
    <ComingSoonDialog />
  </Teleport>
</template>

<style scoped lang="scss">
#app {
  height: 2400px;
  // background-color: #39c5bb;
}
</style>