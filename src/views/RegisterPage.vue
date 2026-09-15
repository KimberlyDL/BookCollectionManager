<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Register</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <form @submit.prevent="handleRegister">
        <ion-item>
          <ion-label position="stacked">Email</ion-label>
          <ion-input v-model="email" type="email" required autocomplete="email" />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Password</ion-label>
          <ion-input v-model="password" type="password" required autocomplete="new-password" />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Confirm Password</ion-label>
          <ion-input v-model="confirmPassword" type="password" required autocomplete="new-password" />
        </ion-item>

        <ion-text color="danger" v-if="errorMessage">
          <p class="ion-padding-start">{{ errorMessage }}</p>
        </ion-text>

        <ion-button expand="block" class="ion-margin-top" type="submit" :disabled="loading">
          {{ loading ? 'Creating account…' : 'Register' }}
        </ion-button>
      </form>

      <ion-button expand="block" fill="clear" router-link="/login">
        Already have an account? Log In
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
import { register } from '../services/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const loading = ref(false);

async function handleRegister() {
  errorMessage.value = '';

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  try {
    await register(email.value, password.value);
    router.replace('/home');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>
