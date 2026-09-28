<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar id="cipher-tab-bar" slot="bottom" class="app-tab-bar">
        <ion-tab-button tab="books" href="/tabs/books">
          <ion-icon :icon="libraryOutline" aria-hidden="true"></ion-icon>
          <ion-label>Books</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="cipher" href="/tabs/cipher">
          <ion-icon :icon="keyOutline" aria-hidden="true"></ion-icon>
          <ion-label>Cipher</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
import { keyOutline, libraryOutline } from 'ionicons/icons';
</script>
