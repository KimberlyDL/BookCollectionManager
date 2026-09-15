<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>My Books</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleLogout">Log Out</ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar>
        <ion-searchbar
          v-model="searchTerm"
          placeholder="Search title or author"
          :debounce="200"
        ></ion-searchbar>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment v-model="statusFilter">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="available">
            <ion-label>Available</ion-label>
          </ion-segment-button>
          <ion-segment-button value="borrowed">
            <ion-label>Borrowed</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <ion-toolbar v-if="categories.length">
        <ion-item lines="none">
          <ion-label>Category</ion-label>
          <ion-select v-model="categoryFilter" interface="popover">
            <ion-select-option value="all">All Categories</ion-select-option>
            <ion-select-option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </ion-select-option>
          </ion-select>
        </ion-item>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-list v-if="pagedBooks.length">
        <ion-item-sliding v-for="book in pagedBooks" :key="book.id">
          <ion-item button @click="editBook(book.id!)">
            <ion-label>
              <h2>{{ book.title }}</h2>
              <p>{{ book.author }} · {{ book.category }} · {{ book.publicationYear }}</p>
            </ion-label>
            <ion-badge :color="book.available ? 'success' : 'medium'" slot="end">
              {{ book.available ? 'Available' : 'Borrowed' }}
            </ion-badge>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="handleDelete(book.id!)">
              Delete
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div v-else class="ion-padding ion-text-center">
        <ion-text color="medium">
          <p v-if="books.length">No books match your search or filters.</p>
          <p v-else>No books yet. Tap + to add your first book.</p>
        </ion-text>
      </div>

      <ion-infinite-scroll
        v-if="hasMore"
        threshold="100px"
        @ionInfinite="loadMore"
      >
        <ion-infinite-scroll-content loading-text="Loading more books…"></ion-infinite-scroll-content>
      </ion-infinite-scroll>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button router-link="/book/new">
          <ion-icon :icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
  type InfiniteScrollCustomEvent,
} from '@ionic/vue';
import { add } from 'ionicons/icons';
import { getCurrentUser, logout } from '../services/auth';
import { deleteBook, subscribeBooks } from '../services/books';
import type { Book } from '../types/Book';

const PAGE_SIZE = 10;

const router = useRouter();
const books = ref<Book[]>([]);
const searchTerm = ref('');
const statusFilter = ref<'all' | 'available' | 'borrowed'>('all');
const categoryFilter = ref('all');
const visibleCount = ref(PAGE_SIZE);
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  const user = await getCurrentUser();
  if (!user) return;
  unsubscribe = subscribeBooks(user.uid, (list) => {
    books.value = list.sort((a, b) => a.title.localeCompare(b.title));
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
});

const categories = computed(() => {
  const unique = new Set(books.value.map((book) => book.category).filter(Boolean));
  return Array.from(unique).sort();
});

const filteredBooks = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();

  return books.value.filter((book) => {
    const matchesSearch =
      !term ||
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'available' ? book.available : !book.available);

    const matchesCategory =
      categoryFilter.value === 'all' || book.category === categoryFilter.value;

    return matchesSearch && matchesStatus && matchesCategory;
  });
});

const pagedBooks = computed(() => filteredBooks.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < filteredBooks.value.length);

watch([searchTerm, statusFilter, categoryFilter], () => {
  visibleCount.value = PAGE_SIZE;
});

function loadMore(event: InfiniteScrollCustomEvent) {
  visibleCount.value += PAGE_SIZE;
  event.target.complete();
}

function editBook(id: string) {
  router.push(`/book/edit/${id}`);
}

async function handleDelete(id: string) {
  await deleteBook(id);
}

async function handleLogout() {
  await logout();
  router.replace('/login');
}
</script>
