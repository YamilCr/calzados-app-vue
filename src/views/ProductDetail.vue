<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToast } from '@/composables/useToast'
import { productApi } from '@/api/client'
import StarRating from '@/components/StarRating.vue'
import ProductCard from '@/components/ProductCard.vue'
import type { Product, ColorDot } from '@/types'

const route = useRoute()
const cart = useCartStore()
const { show } = useToast()

const product = ref<Product | null>(null)
const related = ref<Product[]>([])
const loading = ref(true)
const error = ref(false)

const selectedImage = ref(0)
const selectedSize = ref('')
const selectedColor = ref<ColorDot | null>(null)
const quantity = ref(1)
const addedToCart = ref(false)

onMounted(async () => {
  try {
    const slug = route.params.slug as string
    product.value = await productApi.getBySlug(slug)
    selectedSize.value = product.value.sizes[0]
    selectedColor.value = product.value.colors[0]

    const res = await productApi.list({ category: product.value.category, perPage: 4 })
    related.value = res.data.filter((p) => p.id !== product.value!.id).slice(0, 3)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

function addToCart() {
  if (!product.value || !selectedColor.value || !selectedSize.value) return
  cart.add(product.value, quantity.value, selectedSize.value, selectedColor.value)
  addedToCart.value = true
  show(`"${product.value.name}" added to cart!`, 'success')
  setTimeout(() => (addedToCart.value = false), 2000)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-10">

    <!-- Breadcrumb -->
    <nav class="text-sm text-gray-400 mb-6 flex items-center gap-2">
      <router-link to="/" class="hover:text-brand transition">Home</router-link>
      <i class="fa fa-chevron-right text-xs" />
      <router-link to="/shop" class="hover:text-brand transition">Shop</router-link>
      <i class="fa fa-chevron-right text-xs" />
      <span class="text-gray-600">{{ product?.name ?? '...' }}</span>
    </nav>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid md:grid-cols-2 gap-12 animate-pulse">
      <div class="space-y-3">
        <div class="bg-gray-200 rounded-lg aspect-square" />
        <div class="grid grid-cols-4 gap-2">
          <div v-for="n in 3" :key="n" class="bg-gray-200 rounded aspect-square" />
        </div>
      </div>
      <div class="space-y-4">
        <div class="h-8 bg-gray-200 rounded w-3/4" />
        <div class="h-5 bg-gray-200 rounded w-1/4" />
        <div class="h-4 bg-gray-200 rounded" />
        <div class="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20 text-gray-400">
      <i class="fa fa-triangle-exclamation text-5xl mb-4 text-red-300" />
      <p class="text-lg font-medium">Product not found</p>
      <router-link to="/shop" class="btn-primary mt-4 text-sm">Back to Shop</router-link>
    </div>

    <!-- Product detail -->
    <div v-else-if="product" class="grid md:grid-cols-2 gap-12">

      <!-- Image gallery -->
      <div>
        <div class="rounded-lg overflow-hidden bg-gray-100 mb-3">
          <img
            :src="product.images[selectedImage]"
            :alt="product.name"
            class="w-full aspect-square object-cover"
          />
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="(img, i) in product.images"
            :key="i"
            :class="['rounded overflow-hidden border-2 transition', i === selectedImage ? 'border-brand' : 'border-transparent']"
            @click="selectedImage = i"
          >
            <img :src="img" :alt="`view ${i + 1}`" class="w-full aspect-square object-cover" />
          </button>
        </div>
      </div>

      <!-- Product info -->
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{{ product.name }}</h1>

        <div class="flex items-center gap-3 mb-4">
          <StarRating :rating="product.rating" size="md" />
          <span class="text-sm text-gray-500">{{ product.reviewCount }} reviews</span>
        </div>

        <!-- Price -->
        <div class="flex items-baseline gap-3 mb-5">
          <span class="text-3xl font-bold text-gray-900">${{ product.price.toFixed(2) }}</span>
          <span v-if="product.originalPrice" class="text-lg text-gray-400 line-through">
            ${{ product.originalPrice.toFixed(2) }}
          </span>
          <span
            v-if="product.originalPrice"
            class="text-sm font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded"
          >
            Save {{ Math.round((1 - product.price / product.originalPrice) * 100) }}%
          </span>
        </div>

        <!-- Description -->
        <p class="text-gray-600 leading-relaxed mb-6">{{ product.description }}</p>

        <!-- Size selector -->
        <div class="mb-5">
          <p class="text-sm font-semibold text-gray-700 mb-2">
            Size: <span class="text-brand">{{ selectedSize }}</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="size in product.sizes"
              :key="size"
              :class="[
                'px-3 py-1.5 border rounded text-sm font-medium transition',
                selectedSize === size
                  ? 'border-brand bg-brand text-white'
                  : 'border-gray-300 text-gray-700 hover:border-brand',
              ]"
              @click="selectedSize = size"
            >
              {{ size }}
            </button>
          </div>
        </div>

        <!-- Color selector -->
        <div class="mb-6">
          <p class="text-sm font-semibold text-gray-700 mb-2">
            Color: <span class="text-brand">{{ selectedColor?.name }}</span>
          </p>
          <div class="flex gap-2">
            <button
              v-for="c in product.colors"
              :key="c.hex"
              :title="c.name"
              :style="{ background: c.hex }"
              :class="[
                'w-8 h-8 rounded-full border-2 transition',
                selectedColor?.hex === c.hex ? 'border-brand scale-110' : 'border-gray-200',
              ]"
              @click="selectedColor = c"
            />
          </div>
        </div>

        <!-- Quantity + Add to Cart -->
        <div class="flex items-center gap-4">
          <div class="flex items-center border border-gray-300 rounded overflow-hidden">
            <button
              class="w-10 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
              @click="quantity = Math.max(1, quantity - 1)"
            >
              <i class="fa fa-minus text-xs" />
            </button>
            <span class="w-12 text-center font-semibold text-gray-800">{{ quantity }}</span>
            <button
              class="w-10 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
              @click="quantity++"
            >
              <i class="fa fa-plus text-xs" />
            </button>
          </div>

          <button
            :class="['btn-primary flex-1 py-3 text-base transition', addedToCart ? 'bg-green-600' : '']"
            @click="addToCart"
          >
            <i :class="['fa mr-2', addedToCart ? 'fa-check' : 'fa-cart-plus']" />
            {{ addedToCart ? 'Added!' : 'Add to Cart' }}
          </button>

          <router-link to="/cart" class="btn-outline py-3 px-4">
            <i class="fa fa-shopping-cart" />
          </router-link>
        </div>

        <!-- Tags -->
        <div class="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          <span
            v-for="tag in product.tags"
            :key="tag"
            class="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded"
          >
            #{{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- Related products -->
    <div v-if="related.length > 0" class="mt-16">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">You Might Also Like</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <ProductCard v-for="p in related" :key="p.id" :product="p" />
      </div>
    </div>
  </div>
</template>
