<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditing ? 'Edit Book' : 'Add Book' }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-breadcrumbs>
          <ion-breadcrumb router-link="/home">My Books</ion-breadcrumb>
          <ion-breadcrumb>{{ isEditing ? 'Edit Book' : 'Add Book' }}</ion-breadcrumb>
        </ion-breadcrumbs>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <form @submit.prevent="handleSave">
        <ion-item>
          <ion-label position="stacked">Title</ion-label>
          <ion-input v-model="title" required />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Author</ion-label>
          <ion-input v-model="author" required />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Category</ion-label>
          <ion-input v-model="category" required />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Publication Year</ion-label>
          <ion-input v-model.number="publicationYear" type="number" required />
        </ion-item>

        <ion-item>
          <ion-label>Available</ion-label>
          <ion-toggle v-model="available" slot="end"></ion-toggle>
        </ion-item>

        <ion-item lines="none">
          <ion-label position="stacked">Cover Photo</ion-label>
          <div class="cover-picker">
            <img v-if="previewUrl" :src="previewUrl" class="cover-preview" alt="Cover preview" />
            <input type="file" accept="image/*" @change="onFileChange" />
            <ion-button
              v-if="previewUrl"
              fill="clear"
              color="danger"
              size="small"
              type="button"
              @click="handleRemoveCover"
            >
              Remove Cover
            </ion-button>
          </div>
        </ion-item>

        <ion-text color="danger" v-if="errorMessage">
          <p class="ion-padding-start">{{ errorMessage }}</p>
        </ion-text>

        <ion-button expand="block" class="ion-margin-top" type="submit" :disabled="loading">
          {{ loading ? 'Saving…' : 'Save' }}
        </ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonBackButton,
  IonBreadcrumb,
  IonBreadcrumbs,
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
import { coverUrl, deleteCover, uploadCover } from '../services/covers';

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

const existingCoverKey = ref<string | null>(null);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
let objectUrl: string | null = null;

onMounted(async () => {
  if (!bookId.value) return;
  const book = await getBook(bookId.value);
  if (!book) {
    errorMessage.value = 'Book not found';
    return;
  }
  title.value = book.title;
  author.value = book.author;
  category.value = book.category;
  publicationYear.value = book.publicationYear;
  available.value = book.available;
  if (book.coverKey) {
    existingCoverKey.value = book.coverKey;
    previewUrl.value = coverUrl(book.coverKey);
  }
});

onBeforeUnmount(() => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  selectedFile.value = file;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  previewUrl.value = objectUrl;
}

function handleRemoveCover() {
  selectedFile.value = null;
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  previewUrl.value = null;
}

async function handleSave() {
  errorMessage.value = '';

  if (!publicationYear.value) {
    errorMessage.value = 'Publication year is required';
    return;
  }

  loading.value = true;
  try {
    let coverKey: string | null | undefined = existingCoverKey.value;

    if (selectedFile.value) {
      coverKey = await uploadCover(selectedFile.value);
      if (existingCoverKey.value) {
        await deleteCover(existingCoverKey.value).catch(() => undefined);
      }
    } else if (!previewUrl.value && existingCoverKey.value) {
      await deleteCover(existingCoverKey.value).catch(() => undefined);
      coverKey = null;
    }

    const payload = {
      title: title.value,
      author: author.value,
      category: category.value,
      publicationYear: publicationYear.value,
      available: available.value,
      coverKey,
    };

    if (isEditing.value && bookId.value) {
      await updateBook(bookId.value, payload);
    } else {
      await addBook(payload);
    }

    router.replace('/home');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Save failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.cover-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding-top: 8px;
}

.cover-preview {
  max-width: 160px;
  max-height: 160px;
  object-fit: cover;
  border-radius: 8px;
}
</style>
