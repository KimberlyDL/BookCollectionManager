<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Log In</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <form @submit.prevent="handleLogin">
        <ion-item>
          <ion-label position="stacked">Email</ion-label>
          <ion-input v-model="email" type="email" required autocomplete="email" />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Password</ion-label>
          <ion-input v-model="password" type="password" required autocomplete="current-password" />
        </ion-item>

        <ion-text color="danger" v-if="errorMessage">
          <p class="ion-padding-start">{{ errorMessage }}</p>
        </ion-text>

        <ion-button expand="block" class="ion-margin-top" type="submit" :disabled="loading">
          {{ loading ? 'Logging in…' : 'Log In' }}
        </ion-button>
      </form>

      <ion-button expand="block" fill="clear" router-link="/register">
        Need an account? Register
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { login } from '../services/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);

async function handleLogin() {
  errorMessage.value = '';
  loading.value = true;
  try {
    await login(email.value, password.value);
    router.replace('/home');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>
