<template>
  <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
    <ion-refresher-content></ion-refresher-content>
  </ion-refresher>
</template>

<script setup lang="ts">
import { IonRefresher, IonRefresherContent, type RefresherCustomEvent } from '@ionic/vue';

const props = defineProps<{
  onRefresh: () => void | Promise<void>;
}>();

async function handleRefresh(event: RefresherCustomEvent) {
  await props.onRefresh();
  event.target.complete();
}
</script>
