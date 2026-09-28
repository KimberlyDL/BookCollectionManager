import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue'
import HomePage from '../views/HomePage.vue'
import CipherPage from '../views/CipherPage.vue'
import LoginPage from '../views/LoginPage.vue'
import RegisterPage from '../views/RegisterPage.vue'
import BookFormPage from '../views/BookFormPage.vue'
import { getCurrentUser } from '../services/auth';
import { endRouteNavigation, startRouteNavigation } from '../composables/loadingBar';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/books'
  },
  {
    // Old URL, kept so existing bookmarks/PWA shortcuts still land on the list.
    path: '/home',
    redirect: '/tabs/books'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/books'
      },
      {
        path: 'books',
        name: 'Home',
        component: HomePage,
        meta: { requiresAuth: true }
      },
      {
        // Works signed out and offline — everything runs and is stored on-device.
        path: 'cipher',
        name: 'Cipher',
        component: CipherPage
      }
    ]
  },
  {
    path: '/book/new',
    name: 'NewBook',
    component: BookFormPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/book/edit/:id',
    name: 'EditBook',
    component: BookFormPage,
    meta: { requiresAuth: true },
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  startRouteNavigation();
  const user = await getCurrentUser();

  if (to.meta.requiresAuth && !user) {
    return { name: 'Login' };
  }

  if ((to.name === 'Login' || to.name === 'Register') && user) {
    return { name: 'Home' };
  }

  return true;
})

router.afterEach(() => {
  endRouteNavigation();
})

router.onError(() => {
  endRouteNavigation();
})

export default router
