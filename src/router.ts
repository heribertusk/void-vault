import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/upload',
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('./pages/Upload.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./pages/Login.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('./pages/Register.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/admin',
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('./pages/admin/Dashboard.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('./pages/admin/Users.vue'),
        },
        {
          path: 'devices',
          name: 'admin-devices',
          component: () => import('./pages/admin/Devices.vue'),
        },
      ],
    },
    {
      path: '/d/:fileId',
      name: 'download',
      component: () => import('./pages/download/[fileId].vue'),
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'admin-dashboard' })
    return
  }

  next()
})

export default router
