<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const subscribed = ref(false)

function subscribe() {
  if (email.value.trim()) {
    subscribed.value = true
    email.value = ''
    setTimeout(() => (subscribed.value = false), 3000)
  }
}
</script>

<template>
  <footer class="bg-gray-900 text-gray-300">
    <div class="max-w-7xl mx-auto px-4 pt-12 pb-8">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">

        <!-- Brand -->
        <div>
          <h2 class="text-brand text-xl font-bold border-b border-gray-600 pb-3 mb-4">Zay Shop</h2>
          <ul class="space-y-2 text-sm">
            <li class="flex items-start gap-2">
              <i class="fa fa-map-marker-alt mt-0.5 w-4 shrink-0" />
              <span>123 Consectetur at ligula, 10660</span>
            </li>
            <li>
              <a href="tel:010-020-0340" class="flex items-center gap-2 hover:text-white transition">
                <i class="fa fa-phone w-4" />
                010-020-0340
              </a>
            </li>
            <li>
              <a href="mailto:info@zayshop.com" class="flex items-center gap-2 hover:text-white transition">
                <i class="fa fa-envelope w-4" />
                info@zayshop.com
              </a>
            </li>
          </ul>
        </div>

        <!-- Products -->
        <div>
          <h3 class="text-white text-lg font-semibold border-b border-gray-600 pb-3 mb-4">Products</h3>
          <ul class="space-y-2 text-sm">
            <!-- <li v-for="item in ['Luxury', 'Sport Wear', \"Men's Shoes\", \"Women's Shoes\", 'Gym Accessories', 'Sport Shoes']" :key="item">
              <router-link
                :to="{ path: '/shop', query: { search: item } }"
                class="hover:text-white transition"
              >
                {{ item }}
              </router-link>
            </li> -->
          </ul>
        </div>

        <!-- Further Info -->
        <div>
          <h3 class="text-white text-lg font-semibold border-b border-gray-600 pb-3 mb-4">Further Info</h3>
          <ul class="space-y-2 text-sm">
            <li v-for="link in [{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: 'Shop', to: '/shop' }, { label: 'Contact', to: '/contact' }]" :key="link.to">
              <router-link :to="link.to" class="hover:text-white transition">{{ link.label }}</router-link>
            </li>
          </ul>
        </div>
      </div>

      <!-- Divider -->
      <hr class="border-gray-700 my-8" />

      <!-- Bottom row -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Social icons -->
        <ul class="flex items-center gap-3">
          <li v-for="{ icon, href } in [
            { icon: 'fab fa-facebook-f', href: '#' },
            { icon: 'fab fa-instagram', href: '#' },
            { icon: 'fab fa-twitter', href: '#' },
            { icon: 'fab fa-linkedin-in', href: '#' },
          ]" :key="icon">
            <a
              :href="href"
              target="_blank"
              class="border border-gray-500 rounded-full w-8 h-8 flex items-center justify-center hover:border-white hover:text-white transition"
            >
              <i :class="[icon, 'text-xs']" />
            </a>
          </li>
        </ul>

        <!-- Subscribe -->
        <div class="flex items-center gap-2">
          <input
            v-model="email"
            type="email"
            placeholder="Your email address"
            class="bg-gray-800 border border-gray-600 text-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-brand"
            @keyup.enter="subscribe"
          />
          <button
            class="bg-brand hover:bg-brand-700 text-white text-sm px-4 py-1.5 rounded transition"
            @click="subscribe"
          >
            {{ subscribed ? '✓ Done!' : 'Subscribe' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Copyright bar -->
    <div class="bg-black py-3 text-center text-xs text-gray-500">
      &copy; {{ new Date().getFullYear() }} Zay Shop. All rights reserved.
    </div>
  </footer>
</template>
