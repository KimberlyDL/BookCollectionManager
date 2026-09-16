<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="app-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" text="Back"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditing ? 'Edit Book' : 'Add Book' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="app-content ion-padding">
      <AppRefresher :on-refresh="refreshBook" />

      <form class="app-card app-form-card" @submit.prevent="handleSave">
        <ion-item class="app-field" lines="none">
          <ion-label position="stacked">Title</ion-label>
          <ion-input v-model="title" required />
        </ion-item>

        <ion-item class="app-field" lines="none">
          <ion-label position="stacked">Author</ion-label>
          <ion-input v-model="author" required />
        </ion-item>

        <ion-item class="app-field" lines="none">
          <ion-label position="stacked">Category</ion-label>
          <ion-input v-model="category" required />
        </ion-item>

        <ion-item class="app-field" lines="none">
          <ion-label position="stacked">Publication Year</ion-label>
          <ion-input v-model.number="publicationYear" type="number" required />
        </ion-item>

        <ion-item class="app-field" lines="none">
          <ion-label>Available</ion-label>
          <ion-toggle v-model="available" slot="end"></ion-toggle>
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
          {{ loading ? 'Saving…' : 'Save' }}
        </ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { addBook, getBook, updateBook } from '../services/books';
import { withLoading } from '../composables/loadingBar';
import AppRefresher from '../components/AppRefresher.vue';

const route = useRoute();
const router = useRouter();

const bookId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => !!bookId.value);

const title = ref('');
const author = ref('');
const category = ref('');
const publicationYear = ref<number | null>(null);
const available = ref(true);
const errorMessage = ref('');
const loading = ref(false);

async function loadBook() {
  if (!bookId.value) return;
  const book = await withLoading(() => getBook(bookId.value!));
  if (!book) {
    errorMessage.value = 'Book not found';
    return;
  }
  title.value = book.title;
  author.value = book.author;
  category.value = book.category;
  publicationYear.value = book.publicationYear;
  available.value = book.available;
}

async function refreshBook() {
  errorMessage.value = '';
  if (isEditing.value) {
    await loadBook();
  } else {
    title.value = '';
    author.value = '';
    category.value = '';
    publicationYear.value = null;
    available.value = true;
  }
}

onMounted(loadBook);

async function handleSave() {
  errorMessage.value = '';

  if (!publicationYear.value) {
    errorMessage.value = 'Publication year is required';
    return;
  }

  loading.value = true;
  try {
    const payload = {
      title: title.value,
      author: author.value,
      category: category.value,
      publicationYear: publicationYear.value,
      available: available.value,
    };

    await withLoading(async () => {
      if (isEditing.value && bookId.value) {
        await updateBook(bookId.value, payload);
      } else {
        await addBook(payload);
      }
    });

    router.replace('/home');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Save failed';
  } finally {
    loading.value = false;
  }
}
</script>
