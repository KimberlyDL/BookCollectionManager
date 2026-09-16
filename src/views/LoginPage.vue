<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="app-toolbar">
        <ion-title>Log In</ion-title>
        <ion-buttons slot="end">
          <ion-button
            class="app-theme-toggle"
            @click="toggleTheme"
            :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <ion-icon slot="icon-only" :icon="theme === 'dark' ? sunnyOutline : moonOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="app-content">
      <AppRefresher :on-refresh="resetForm" />

      <div class="app-auth-wrapper">
        <div class="app-card app-auth-card">
          <h1 class="app-auth-title">Welcome back</h1>
          <p class="app-auth-subtitle">Log in to your book collection.</p>

          <form @submit.prevent="handleLogin">
            <ion-item class="app-field" lines="none">
              <ion-label position="stacked">Email</ion-label>
              <ion-input v-model="email" type="email" required autocomplete="email" />
            </ion-item>

            <ion-item class="app-field" lines="none">
              <ion-label position="stacked">Password</ion-label>
              <ion-input v-model="password" type="password" required autocomplete="current-password" />
            </ion-item>

            <ion-text color="danger" v-if="errorMessage">
              <p class="ion-padding-start">{{ errorMessage }}</p>
            </ion-text>

            <ion-button
              expand="block"
              class="ion-margin-top app-primary-button"
              type="submit"
              :disabled="loading"
            >
              {{ loading ? 'Logging in…' : 'Log In' }}
            </ion-button>
          </form>

          <ion-button expand="block" fill="clear" class="app-link-button" router-link="/register">
            Need an account? Register
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { login } from '../services/auth';
import { withLoading } from '../composables/loadingBar';
import { theme, toggleTheme } from '../composables/theme';
import AppRefresher from '../components/AppRefresher.vue';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);

function resetForm() {
  email.value = '';
  password.value = '';
  errorMessage.value = '';
}

async function handleLogin() {
  errorMessage.value = '';
  loading.value = true;
  try {
    await withLoading(() => login(email.value, password.value));
    router.replace('/home');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>
