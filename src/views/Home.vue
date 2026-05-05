<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HeroCarousel from '@/components/HeroCarousel.vue'
import ProductCard from '@/components/ProductCard.vue'
import { productApi, catalogApi } from '@/api/client'
import type { Product, Categoria } from '@/api/client'

const featured   = ref<Product[]>([])
const categorias = ref<Categoria[]>([])
const loading    = ref(true)

onMounted(async () => {
  try {
    const [feat, cats] = await Promise.all([
      productApi.getFeatured(),
      catalogApi.listCategorias(),
    ])
    featured.value   = feat
    // Mostrar solo las primeras 3 categorías que tengan nombre
    categorias.value = cats.slice(0, 3)
  } catch (e) {
    console.error('Error cargando home:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- Hero Carousel -->
  <HeroCarousel />

  <!-- Categories of the Month -->
  <section class="max-w-7xl mx-auto px-4 py-14">
    <div class="text-center mb-10">
      <h2 class="text-3xl font-bold text-gray-800">Categories of The Month</h2>
      <p class="text-gray-500 mt-2 max-w-lg mx-auto">
        Explore our most popular product categories. Something for every style and occasion.
      </p>
    </div>

    <!-- Skeleton categorías -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-3 gap-8">
      <div v-for="n in 3" :key="n" class="flex flex-col items-center gap-3 animate-pulse">
        <div class="w-40 h-40 rounded-full bg-gray-200" />
        <div class="h-4 bg-gray-200 rounded w-24" />
        <div class="h-8 bg-gray-200 rounded w-20" />
      </div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-8">
      <div
        v-for="cat in categorias"
        :key="cat.id"
        class="flex flex-col items-center text-center group"
      >
        <router-link
          :to="{ path: '/shop', query: { categoria: cat.nombre } }"
          class="block"
        >
          <!--
            El backend no almacena imagen de categoría actualmente.
            Se muestra un ícono placeholder. Si en el futuro se agrega
            una columna `imagen` a la tabla categorias, reemplazar con:
            <img :src="cat.imagen" ... />
          -->
          <div class="w-40 h-40 rounded-full bg-brand/10 border-4 border-gray-200 group-hover:border-brand transition-all duration-300 shadow flex items-center justify-center">
            <i class="fa fa-tag text-brand text-4xl" />
          </div>
        </router-link>
        <h3 class="mt-4 font-semibold text-lg text-gray-800">{{ cat.nombre }}</h3>
        <router-link
          :to="{ path: '/shop', query: { categoria: cat.nombre } }"
          class="btn-primary mt-3 text-sm px-6 py-2"
        >
          Go Shop
        </router-link>
      </div>
    </div>
  </section>

  <!-- Featured Products -->
  <section class="bg-gray-50 py-14">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold text-gray-800">Featured Products</h2>
        <p class="text-gray-500 mt-2 max-w-lg mx-auto">
          Hand-picked highlights from our latest collection.
        </p>
      </div>

      <!-- Skeleton productos -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="n" class="bg-white rounded shadow-sm animate-pulse">
          <div class="h-52 bg-gray-200 rounded-t" />
          <div class="p-4 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-3/4" />
            <div class="h-3 bg-gray-200 rounded w-1/2" />
            <div class="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      </div>

      <div v-else-if="featured.length === 0" class="text-center py-16 text-gray-400">
        <i class="fa fa-box-open text-5xl mb-4 block" />
        <p>No hay productos destacados por el momento.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <ProductCard v-for="p in featured" :key="p.id" :product="p" />
      </div>

      <div class="text-center mt-10">
        <router-link to="/shop" class="btn-outline text-base px-8 py-3">
          View All Products <i class="fa fa-arrow-right ml-2" />
        </router-link>
      </div>
    </div>
  </section>

  <!-- Why Choose Us -->
  <section class="max-w-7xl mx-auto px-4 py-14">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div
        v-for="item in [
          { icon: 'fa-truck',        title: 'Free Shipping',   sub: 'On orders over $500' },
          { icon: 'fa-rotate-left',  title: 'Easy Returns',    sub: '30-day return policy' },
          { icon: 'fa-lock',         title: 'Secure Payment',  sub: '100% secure checkout' },
          { icon: 'fa-headset',      title: '24/7 Support',    sub: 'Here when you need us' },
        ]"
        :key="item.title"
      >
        <div class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center">
            <i :class="['fa', item.icon, 'text-brand text-xl']" />
          </div>
          <h4 class="font-semibold text-gray-800">{{ item.title }}</h4>
          <p class="text-xs text-gray-500">{{ item.sub }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
