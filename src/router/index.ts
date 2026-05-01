import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { title: 'Home' },
    },
    {
      path: '/shop',
      name: 'shop',
      component: () => import('@/views/Shop.vue'),
      meta: { title: 'Shop' },
    },
    {
      path: '/product/:slug',
      name: 'product-detail',
      component: () => import('@/views/ProductDetail.vue'),
      meta: { title: 'Product' },
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('@/views/Cart.vue'),
      meta: { title: 'Cart' },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/views/Checkout.vue'),
      meta: { title: 'Checkout', requiresAuth: false }, // set true for real auth
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/Orders.vue'),
      meta: { title: 'My Orders', requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/About.vue'),
      meta: { title: 'About Us' },
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('@/views/Contact.vue'),
      meta: { title: 'Contact' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
})

// ─── Auth guard ───────────────────────────────────────────────────────────────
router.beforeEach((to) => {
  // Update document title
  document.title = `${to.meta.title ?? 'Page'} | Zay Shop`

  if (to.meta.requiresAuth) {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) {
      return { name: 'home', query: { redirect: to.fullPath } }
    }
  }
})

export default router
