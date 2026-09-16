<template>
  <div v-if="isLoading" class="app-loading-bar" role="progressbar" aria-label="Loading">
    <div class="app-loading-bar__inner"></div>
  </div>
</template>

<script setup lang="ts">
import { isLoading } from '../composables/loadingBar';
</script>
