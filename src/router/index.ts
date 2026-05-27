import { createRouter, createWebHistory } from 'vue-router'
import { authState } from '../auth'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/einstellungen',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/impressum',
      name: 'impressum',
      component: () => import('../views/ImpressumView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  if (to.name === 'login' && authState.isLoggedIn) {
    return '/dashboard'
  }

  if (to.meta.requiresAuth && !authState.isLoggedIn) {
    return '/login'
  }
})

export default router
