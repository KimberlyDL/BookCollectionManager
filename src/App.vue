<template>
  <ion-app>
    <AppLoadingBar />
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import AppLoadingBar from './components/AppLoadingBar.vue';
</script>
