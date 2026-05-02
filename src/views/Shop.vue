<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductCard from '@/components/ProductCard.vue'
import { productApi } from '@/api/client'
import type { Product, ProductFilters } from '@/types'

const route = useRoute()
const router = useRouter()

// ─── State ────────────────────────────────────────────────────────────────────
const products = ref<Product[]>([])
const totalProducts = ref(0)
const totalPages = ref(1)
const loading = ref(true)

const filters = ref<ProductFilters>({
  category: (route.query.category as string) || undefined,
  gender: (route.query.gender as string) || undefined,
  search: (route.query.search as string) || undefined,
  sortBy: (route.query.sortBy as ProductFilters['sortBy']) || 'featured',
  page: 1,
  perPage: 9,
})

const sidebarOpen = ref(false) // mobile

// ─── Categories sidebar data ──────────────────────────────────────────────────
const categoryGroups = [
  { label: 'Category', key: 'category', options: [
    { value: 'shoes', label: 'Shoes' },
    { value: 'watches', label: 'Watches' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'clothing', label: 'Clothing' },
  ]},
  { label: 'Gender', key: 'gender', options: [
    { value: 'men', label: 'Men' },
    { value: 'women', label: 'Women' },
    { value: 'unisex', label: 'Unisex' },
  ]},
]

const sortOptions: Array<{ value: ProductFilters['sortBy']; label: string }> = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'rating', label: 'Best Rating' },
]

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchProducts() {
  loading.value = true
  try {
    const res = await productApi.list(filters.value)
    products.value = res.data
    totalProducts.value = res.total
    totalPages.value = res.totalPages
  } finally {
    loading.value = false
  }
}

function applyFilter(key: string, value: string) {
  const current = (filters.value as Record<string, unknown>)[key]
  ;(filters.value as Record<string, unknown>)[key] = current === value ? undefined : value
  filters.value.page = 1
}

function clearFilters() {
  filters.value = { sortBy: 'featured', page: 1, perPage: 9 }
  router.replace({ query: {} })
}

watch(
  filters,
  () => {
    fetchProducts()
    router.replace({
      query: Object.fromEntries(
        Object.entries(filters.value).filter(([, v]) => v !== undefined),
      ),
    })
  },
  { deep: true },
)

onMounted(fetchProducts)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-10">

    <!-- Header row -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">
        Shop
        <span v-if="filters.search" class="text-base font-normal text-gray-500">
          — results for "{{ filters.search }}"
        </span>
      </h1>
      <button
        class="lg:hidden btn-ghost border border-gray-200 text-sm"
        @click="sidebarOpen = !sidebarOpen"
      >
        <i class="fa fa-sliders mr-1" /> Filters
      </button>
    </div>

    <div class="flex gap-8">
      <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
      <aside
        :class="[
          'w-64 shrink-0',
          'lg:block',
          sidebarOpen ? 'block' : 'hidden',
          'lg:static fixed inset-y-0 left-0 z-40 bg-white lg:bg-transparent shadow-xl lg:shadow-none p-6 lg:p-0 overflow-y-auto',
        ]"
      >
        <!-- Mobile close -->
        <button
          class="lg:hidden mb-4 text-gray-400 hover:text-gray-700"
          @click="sidebarOpen = false"
        >
          <i class="fa fa-xmark" /> Close
        </button>

        <h2 class="text-lg font-bold text-gray-800 mb-4">Filters</h2>

        <div v-for="group in categoryGroups" :key="group.key" class="mb-6">
          <h3 class="font-semibold text-gray-700 mb-2 flex items-center justify-between">
            {{ group.label }}
            <i class="fa fa-chevron-down text-xs text-gray-400" />
          </h3>
          <ul class="space-y-1">
            <li v-for="opt in group.options" :key="opt.value">
              <button
                :class="[
                  'w-full text-left px-2 py-1 rounded text-sm transition',
                  (filters as Record<string, unknown>)[group.key] === opt.value
                    ? 'bg-brand text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100',
                ]"
                @click="applyFilter(group.key, opt.value)"
              >
                {{ opt.label }}
              </button>
            </li>
          </ul>
        </div>

        <button
          v-if="filters.category || filters.gender || filters.search"
          class="text-xs text-red-500 hover:text-red-700 mt-2"
          @click="clearFilters"
        >
          <i class="fa fa-xmark mr-1" /> Clear all filters
        </button>
      </aside>

      <!-- Mobile sidebar backdrop -->
      <div
        v-if="sidebarOpen"
        class="lg:hidden fixed inset-0 bg-black/40 z-30"
        @click="sidebarOpen = false"
      />

      <!-- ── Product grid ─────────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0">

        <!-- Top controls: tabs + sort -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div class="flex gap-3">
              <button
                v-for="tab in [
                  { label: 'All', value: undefined },]"
                :key="tab.label"
                :class="[
                  'text-sm font-semibold transition pb-0.5',
                  filters.gender === tab.value
                    ? 'text-brand border-b-2 border-brand'
                    : 'text-gray-600 hover:text-brand',
                ]"
                @click="filters.gender = tab.value; filters.page = 1"
              >
                {{ tab.label }}
              </button>
          </div>
          <select
            v-model="filters.sortBy"
            class="input w-48 text-sm"
          >
            <option v-for="o in sortOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </div>

        <!-- Results count -->
        <p class="text-xs text-gray-400 mb-4">
          {{ totalProducts }} product{{ totalProducts !== 1 ? 's' : '' }} found
        </p>

        <!-- Skeleton -->
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <div v-for="n in 9" :key="n" class="bg-white rounded shadow-sm animate-pulse">
            <div class="h-52 bg-gray-200 rounded-t" />
            <div class="p-4 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-3/4" />
              <div class="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="products.length === 0"
          class="text-center py-20 text-gray-400"
        >
          <i class="fa fa-box-open text-5xl mb-4" />
          <p class="text-lg font-medium">No products found</p>
          <button class="btn-outline mt-4 text-sm" @click="clearFilters">Clear filters</button>
        </div>

        <!-- Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <ProductCard v-for="p in products" :key="p.id" :product="p" />
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-end gap-2 mt-10">
          <button
            v-for="n in totalPages"
            :key="n"
            :class="[
              'w-9 h-9 rounded flex items-center justify-center text-sm font-medium transition',
              filters.page === n
                ? 'bg-brand text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            ]"
            @click="filters.page = n"
          >
            {{ n }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
