import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue'
import LoginPage from '../views/LoginPage.vue'
import RegisterPage from '../views/RegisterPage.vue'
import BookFormPage from '../views/BookFormPage.vue'
import { getCurrentUser } from '../services/auth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
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
    path: '/home',
    name: 'Home',
    component: HomePage,
    meta: { requiresAuth: true }
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
  const user = await getCurrentUser();

  if (to.meta.requiresAuth && !user) {
    return { name: 'Login' };
  }

  if ((to.name === 'Login' || to.name === 'Register') && user) {
    return { name: 'Home' };
  }

  return true;
})

export default router
