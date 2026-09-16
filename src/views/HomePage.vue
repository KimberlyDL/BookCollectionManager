<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="app-toolbar">
        <ion-title>BookLook</ion-title>
        <ion-buttons slot="end">
          <ion-button
            class="app-theme-toggle"
            @click="toggleTheme"
            :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <ion-icon slot="icon-only" :icon="theme === 'dark' ? sunnyOutline : moonOutline"></ion-icon>
          </ion-button>
          <ion-button @click="handleRefresh" :disabled="refreshing" aria-label="Refresh">
            <ion-icon slot="icon-only" :icon="refreshOutline" :class="{ spinning: refreshing }"></ion-icon>
          </ion-button>
          <ion-button @click="handleLogout" aria-label="Log Out">
            <ion-icon slot="icon-only" :icon="logOutOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar class="app-toolbar">
        <ion-searchbar
          v-model="searchTerm"
          placeholder="Search title or author"
          :debounce="200"
        ></ion-searchbar>
      </ion-toolbar>

      <ion-toolbar class="app-toolbar">
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

      <ion-toolbar v-if="categories.length" class="app-toolbar app-category-toolbar">
        <ion-item lines="none">
          <ion-label>Category</ion-label>
          <ion-select v-model="categoryFilter" interface="popover">
            <ion-select-option value="all">All Categories</ion-select-option>
            <ion-select-option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-buttons slot="end" class="app-view-toggle">
          <ion-button
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            aria-label="List view"
          >
            <ion-icon slot="icon-only" :icon="listOutline"></ion-icon>
          </ion-button>
          <ion-button
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            aria-label="Grid view"
          >
            <ion-icon slot="icon-only" :icon="gridOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="app-content">
      <AppRefresher :on-refresh="refetch" />

      <div v-if="pagedBooks.length" class="app-list" :class="{ 'app-list--grid': viewMode === 'grid' }">
        <ion-item-sliding v-for="book in pagedBooks" :key="book.id">
          <div class="app-card app-book-card" @click="editBook(book.id!)">
            <ion-button
              class="app-book-delete"
              fill="clear"
              color="danger"
              aria-label="Delete book"
              @click.stop="confirmDelete(book)"
            >
              <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
            </ion-button>
            <div class="app-book-card-top">
              <h2 class="app-book-title">{{ book.title }}</h2>
              <ion-badge
                class="app-book-badge"
                :color="book.available ? 'tertiary' : 'medium'"
              >
                {{ book.available ? 'Available' : 'Borrowed' }}
              </ion-badge>
            </div>
            <p class="app-book-meta">{{ book.author }} · {{ book.category }} · {{ book.publicationYear }}</p>
          </div>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmDelete(book)">
              Delete
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </div>

      <div v-else class="app-empty-state">
        <ion-icon :icon="bookOutline"></ion-icon>
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
        <ion-fab-button class="app-fab-button" router-link="/book/new">
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
  alertController,
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
import {
  add,
  bookOutline,
  gridOutline,
  listOutline,
  logOutOutline,
  moonOutline,
  refreshOutline,
  sunnyOutline,
  trashOutline,
} from 'ionicons/icons';
import { getCurrentUser, logout } from '../services/auth';
import { deleteBook, subscribeBooks } from '../services/books';
import { startLoading, stopLoading } from '../composables/loadingBar';
import { theme, toggleTheme } from '../composables/theme';
import AppRefresher from '../components/AppRefresher.vue';
import type { Book } from '../types/Book';

const PAGE_SIZE = 10;
const VIEW_MODE_KEY = 'booklook-view-mode';

const router = useRouter();
const books = ref<Book[]>([]);
const searchTerm = ref('');
const statusFilter = ref<'all' | 'available' | 'borrowed'>('all');
const categoryFilter = ref('all');
const visibleCount = ref(PAGE_SIZE);
const refreshing = ref(false);
const viewMode = ref<'list' | 'grid'>(
  (localStorage.getItem(VIEW_MODE_KEY) as 'list' | 'grid' | null) ?? 'list'
);

watch(viewMode, (mode) => {
  localStorage.setItem(VIEW_MODE_KEY, mode);
});
let unsubscribe: (() => void) | null = null;
let currentUid: string | null = null;

function subscribe(uid: string, onFirstSnapshot?: () => void) {
  let resolved = false;
  return subscribeBooks(uid, (list) => {
    books.value = list.sort((a, b) => a.title.localeCompare(b.title));
    if (!resolved) {
      resolved = true;
      onFirstSnapshot?.();
    }
  });
}

onMounted(async () => {
  startLoading();
  const user = await getCurrentUser();
  if (!user) {
    stopLoading();
    return;
  }
  currentUid = user.uid;
  unsubscribe = subscribe(currentUid, stopLoading);
});

onBeforeUnmount(() => {
  unsubscribe?.();
});

function refetch(): Promise<void> {
  return new Promise((resolve) => {
    if (!currentUid) {
      resolve();
      return;
    }
    unsubscribe?.();
    unsubscribe = subscribe(currentUid, resolve);
  });
}

async function handleRefresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  startLoading();
  try {
    await refetch();
  } finally {
    refreshing.value = false;
    stopLoading();
  }
}

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
  startLoading();
  try {
    await deleteBook(id);
  } finally {
    stopLoading();
  }
}

async function confirmDelete(book: Book) {
  const alert = await alertController.create({
    header: 'Delete book',
    message: `Delete "${book.title}"? This cannot be undone.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: () => handleDelete(book.id!),
      },
    ],
  });
  await alert.present();
}

async function handleLogout() {
  await logout();
  router.replace('/login');
}
</script>

<style scoped>
ion-icon.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
