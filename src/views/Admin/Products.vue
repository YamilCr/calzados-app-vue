<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductsStore } from '@/stores/products'
import { useToast } from '@/composables/useToast'
import type { Product, ColorDot } from '@/types'

const store = useProductsStore()
const toast = useToast()

// ─── Estado de tabla / búsqueda ───────────────────────────────────────────────
const search = ref('')
const categoryFilter = ref('')
const sortField = ref<'name' | 'price' | 'category'>('name')
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const perPage = 8

const categories = ['shoes', 'clothing', 'accessories', 'watches']

const filteredProducts = computed(() => {
  let list = store.products

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }
  if (categoryFilter.value)
    list = list.filter((p) => p.category === categoryFilter.value)

  list = [...list].sort((a, b) => {
    const va = String(a[sortField.value])
    const vb = String(b[sortField.value])
    return sortDir.value === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  return list
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredProducts.value.length / perPage)),
)

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredProducts.value.slice(start, start + perPage)
})

function setSort(field: typeof sortField.value) {
  if (sortField.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortField.value = field; sortDir.value = 'asc' }
}

// ─── Modal / formulario ───────────────────────────────────────────────────────
const modalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const deleteTarget = ref<Product | null>(null)
const confirmOpen = ref(false)

const EMPTY_FORM = (): Omit<Product, 'id' | 'slug'> => ({
  name: '',
  price: 0,
  originalPrice: undefined,
  image: '',
  images: [],
  rating: 0,
  reviewCount: 0,
  category: 'shoes',
  gender: 'unisex',
  sizes: [],
  colors: [],
  description: '',
  featured: false,
  inStock: true,
  tags: [],
})

const form = ref(EMPTY_FORM())

// ── Helpers para campos array/color dentro del form ──────────────────────────
const sizesInput = ref('')   // ej: "38,39,40,41"
const tagsInput = ref('')    // ej: "sport,running"
const colorsInput = ref('')  // ej: "Black:#1a1a1a, White:#ffffff"
const imagesInput = ref('')  // una URL por línea

const formErrors = ref<Record<string, string>>({})

function validate(): boolean {
  formErrors.value = {}
  if (!form.value.name.trim()) formErrors.value.name = 'El nombre es obligatorio.'
  if (form.value.price <= 0) formErrors.value.price = 'El precio debe ser mayor a 0.'
  if (!form.value.image.trim()) formErrors.value.image = 'La URL de imagen principal es obligatoria.'
  if (!form.value.description.trim()) formErrors.value.description = 'La descripción es obligatoria.'
  return Object.keys(formErrors.value).length === 0
}

function parseColorsInput(raw: string): ColorDot[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [name, hex] = s.split(':').map((x) => x.trim())
      return { name: name || '', hex: hex || '#000000' }
    })
}

function openCreate() {
  isEditing.value = false
  editingId.value = null
  form.value = EMPTY_FORM()
  sizesInput.value = ''
  tagsInput.value = ''
  colorsInput.value = ''
  imagesInput.value = ''
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(product: Product) {
  isEditing.value = true
  editingId.value = product.id
  form.value = {
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    image: product.image,
    images: [...product.images],
    rating: product.rating,
    reviewCount: product.reviewCount,
    category: product.category,
    gender: product.gender,
    sizes: [...product.sizes],
    colors: [...product.colors],
    description: product.description,
    featured: product.featured,
    inStock: product.inStock,
    tags: [...product.tags],
  }
  sizesInput.value = product.sizes.join(', ')
  tagsInput.value = product.tags.join(', ')
  colorsInput.value = product.colors.map((c) => `${c.name}:${c.hex}`).join(', ')
  imagesInput.value = product.images.join('\n')
  formErrors.value = {}
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function saveProduct() {
  // Sincronizar campos array antes de validar
  form.value.sizes = sizesInput.value.split(',').map((s) => s.trim()).filter(Boolean)
  form.value.tags = tagsInput.value.split(',').map((s) => s.trim()).filter(Boolean)
  form.value.colors = parseColorsInput(colorsInput.value)
  form.value.images = imagesInput.value.split('\n').map((s) => s.trim()).filter(Boolean)

  if (!validate()) return

  try {
    if (isEditing.value && editingId.value !== null) {
      store.update(editingId.value, form.value)
      toast.success('Producto actualizado correctamente.')
    } else {
      store.create(form.value)
      toast.success('Producto creado correctamente.')
    }
    closeModal()
    // volver a página 1 al crear
    if (!isEditing.value) currentPage.value = 1
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Error al guardar.')
  }
}

function askDelete(product: Product) {
  deleteTarget.value = product
  confirmOpen.value = true
}

function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    store.remove(deleteTarget.value.id)
    toast.success(`"${deleteTarget.value.name}" eliminado.`)
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Error al eliminar.')
  } finally {
    confirmOpen.value = false
    deleteTarget.value = null
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">

    <!-- ── Cabecera ──────────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          <i class="fa fa-box-open text-brand mr-2" />Gestión de Productos
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ store.products.length }} producto{{ store.products.length !== 1 ? 's' : '' }} en total
        </p>
      </div>
      <button class="btn-primary gap-2" @click="openCreate">
        <i class="fa fa-plus" />Nuevo Producto
      </button>
    </div>

    <!-- ── Filtros ───────────────────────────────────────────────────── -->
    <div class="flex flex-wrap gap-3 mb-5">
      <div class="relative flex-1 min-w-[200px]">
        <i class="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input
          v-model="search"
          type="text"
          placeholder="Buscar por nombre o categoría…"
          class="input pl-9"
          @input="currentPage = 1"
        />
      </div>
      <select
        v-model="categoryFilter"
        class="input w-44"
        @change="currentPage = 1"
      >
        <option value="">Todas las categorías</option>
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ cat.charAt(0).toUpperCase() + cat.slice(1) }}
        </option>
      </select>
    </div>

    <!-- ── Tabla ─────────────────────────────────────────────────────── -->
    <div class="bg-white rounded-xl shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th class="px-4 py-3 text-left w-16">Img</th>
              <th
                class="px-4 py-3 text-left cursor-pointer hover:text-brand transition select-none"
                @click="setSort('name')"
              >
                Nombre
                <i
                  :class="['fa ml-1', sortField === 'name'
                    ? (sortDir === 'asc' ? 'fa-arrow-up text-brand' : 'fa-arrow-down text-brand')
                    : 'fa-sort text-gray-300']"
                />
              </th>
              <th
                class="px-4 py-3 text-left cursor-pointer hover:text-brand transition select-none"
                @click="setSort('category')"
              >
                Categoría
                <i
                  :class="['fa ml-1', sortField === 'category'
                    ? (sortDir === 'asc' ? 'fa-arrow-up text-brand' : 'fa-arrow-down text-brand')
                    : 'fa-sort text-gray-300']"
                />
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer hover:text-brand transition select-none"
                @click="setSort('price')"
              >
                Precio
                <i
                  :class="['fa ml-1', sortField === 'price'
                    ? (sortDir === 'asc' ? 'fa-arrow-up text-brand' : 'fa-arrow-down text-brand')
                    : 'fa-sort text-gray-300']"
                />
              </th>
              <th class="px-4 py-3 text-center">Stock</th>
              <th class="px-4 py-3 text-center">Destacado</th>
              <th class="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="paginated.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                <i class="fa fa-inbox text-3xl block mb-2" />
                No se encontraron productos.
              </td>
            </tr>
            <tr
              v-for="product in paginated"
              :key="product.id"
              class="hover:bg-gray-50 transition"
            >
              <!-- Imagen -->
              <td class="px-4 py-3">
                <img
                  :src="product.image"
                  :alt="product.name"
                  class="w-12 h-12 object-cover rounded-lg border border-gray-200"
                  loading="lazy"
                />
              </td>
              <!-- Nombre -->
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900 truncate max-w-[180px]">{{ product.name }}</p>
                <p class="text-xs text-gray-400 font-mono">{{ product.slug }}</p>
              </td>
              <!-- Categoría / género -->
              <td class="px-4 py-3">
                <span class="capitalize">{{ product.category }}</span>
                <span class="ml-1.5 text-xs text-gray-400">({{ product.gender }})</span>
              </td>
              <!-- Precio -->
              <td class="px-4 py-3 text-right">
                <span class="font-semibold text-gray-900">${{ product.price }}</span>
                <span v-if="product.originalPrice" class="ml-1 text-xs text-gray-400 line-through">
                  ${{ product.originalPrice }}
                </span>
              </td>
              <!-- Stock -->
              <td class="px-4 py-3 text-center">
                <span
                  :class="[
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    product.inStock
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600',
                  ]"
                >
                  <i :class="['fa text-[9px]', product.inStock ? 'fa-circle-check' : 'fa-circle-xmark']" />
                  {{ product.inStock ? 'Disponible' : 'Sin stock' }}
                </span>
              </td>
              <!-- Destacado -->
              <td class="px-4 py-3 text-center">
                <i
                  :class="[
                    'fa fa-star',
                    product.featured ? 'text-yellow-400' : 'text-gray-200',
                  ]"
                />
              </td>
              <!-- Acciones -->
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button
                    class="p-1.5 rounded hover:bg-brand/10 text-gray-500 hover:text-brand transition"
                    title="Editar"
                    @click="openEdit(product)"
                  >
                    <i class="fa fa-pen-to-square" />
                  </button>
                  <button
                    class="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition"
                    title="Eliminar"
                    @click="askDelete(product)"
                  >
                    <i class="fa fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500"
      >
        <span>
          Página {{ currentPage }} de {{ totalPages }}
          ({{ filteredProducts.length }} resultados)
        </span>
        <div class="flex gap-1">
          <button
            class="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            <i class="fa fa-chevron-left" />
          </button>
          <button
            v-for="p in totalPages"
            :key="p"
            :class="[
              'px-3 py-1 rounded border transition',
              p === currentPage
                ? 'bg-brand text-white border-brand'
                : 'hover:bg-gray-50',
            ]"
            @click="currentPage = p"
          >
            {{ p }}
          </button>
          <button
            class="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            <i class="fa fa-chevron-right" />
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- Modal Crear / Editar                                               -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="modalOpen"
          class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
          @mousedown.self="closeModal"
        >
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <!-- Header modal -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-lg font-bold text-gray-900">
                <i :class="['fa mr-2 text-brand', isEditing ? 'fa-pen-to-square' : 'fa-plus-circle']" />
                {{ isEditing ? 'Editar Producto' : 'Nuevo Producto' }}
              </h2>
              <button
                class="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                @click="closeModal"
              >
                <i class="fa fa-xmark text-lg" />
              </button>
            </div>

            <!-- Body modal -->
            <div class="px-6 py-5 space-y-5">

              <!-- Nombre -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span class="text-red-500">*</span>
                </label>
                <input v-model="form.name" type="text" class="input" placeholder="Ej: Cloud Runner Shoes" />
                <p v-if="formErrors.name" class="text-red-500 text-xs mt-1">{{ formErrors.name }}</p>
              </div>

              <!-- Precio / Precio original -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Precio <span class="text-red-500">*</span>
                  </label>
                  <input v-model.number="form.price" type="number" min="0" step="0.01" class="input" />
                  <p v-if="formErrors.price" class="text-red-500 text-xs mt-1">{{ formErrors.price }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Precio original</label>
                  <input v-model.number="form.originalPrice" type="number" min="0" step="0.01" class="input" placeholder="Opcional" />
                </div>
              </div>

              <!-- Categoría / Género -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select v-model="form.category" class="input">
                    <option v-for="cat in categories" :key="cat" :value="cat">
                      {{ cat.charAt(0).toUpperCase() + cat.slice(1) }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Género</label>
                  <select v-model="form.gender" class="input">
                    <option value="men">Hombre</option>
                    <option value="women">Mujer</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
              </div>

              <!-- Imagen principal -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  URL Imagen principal <span class="text-red-500">*</span>
                </label>
                <input v-model="form.image" type="url" class="input" placeholder="https://..." />
                <p v-if="formErrors.image" class="text-red-500 text-xs mt-1">{{ formErrors.image }}</p>
                <!-- Preview -->
                <img
                  v-if="form.image"
                  :src="form.image"
                  alt="preview"
                  class="mt-2 w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
              </div>

              <!-- Imágenes adicionales -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Imágenes adicionales
                  <span class="text-gray-400 font-normal">(una URL por línea)</span>
                </label>
                <textarea
                  v-model="imagesInput"
                  class="input resize-none"
                  rows="3"
                  placeholder="https://imagen1.com&#10;https://imagen2.com"
                />
              </div>

              <!-- Descripción -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Descripción <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="form.description"
                  class="input resize-none"
                  rows="3"
                  placeholder="Descripción del producto..."
                />
                <p v-if="formErrors.description" class="text-red-500 text-xs mt-1">{{ formErrors.description }}</p>
              </div>

              <!-- Talles -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Talles
                  <span class="text-gray-400 font-normal">(separados por coma)</span>
                </label>
                <input v-model="sizesInput" type="text" class="input" placeholder="Ej: 38, 39, 40, 41" />
              </div>

              <!-- Colores -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Colores
                  <span class="text-gray-400 font-normal">(Nombre:#hex separados por coma)</span>
                </label>
                <input v-model="colorsInput" type="text" class="input" placeholder="Ej: Black:#1a1a1a, White:#ffffff" />
                <!-- Preview colores -->
                <div v-if="colorsInput.trim()" class="flex gap-1.5 mt-2 flex-wrap">
                  <span
                    v-for="(c, i) in parseColorsInput(colorsInput)"
                    :key="i"
                    class="flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-0.5"
                  >
                    <span
                      class="w-3 h-3 rounded-full border border-gray-300 inline-block"
                      :style="{ backgroundColor: c.hex }"
                    />
                    {{ c.name }}
                  </span>
                </div>
              </div>

              <!-- Tags -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                  <span class="text-gray-400 font-normal">(separados por coma)</span>
                </label>
                <input v-model="tagsInput" type="text" class="input" placeholder="Ej: sport, running, men" />
              </div>

              <!-- Toggles -->
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input v-model="form.inStock" type="checkbox" class="w-4 h-4 rounded accent-brand" />
                  <span class="text-sm font-medium text-gray-700">En stock</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input v-model="form.featured" type="checkbox" class="w-4 h-4 rounded accent-brand" />
                  <span class="text-sm font-medium text-gray-700">Destacado</span>
                </label>
              </div>
            </div>

            <!-- Footer modal -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button class="btn-ghost" @click="closeModal">Cancelar</button>
              <button class="btn-primary" @click="saveProduct">
                <i :class="['fa mr-1.5', isEditing ? 'fa-floppy-disk' : 'fa-plus']" />
                {{ isEditing ? 'Guardar cambios' : 'Crear producto' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- Diálogo confirmar eliminación                                       -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="confirmOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          @mousedown.self="confirmOpen = false"
        >
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <i class="fa fa-triangle-exclamation text-red-500" />
              </div>
              <h3 class="font-bold text-gray-900">Eliminar producto</h3>
            </div>
            <p class="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que querés eliminar
              <strong>{{ deleteTarget?.name }}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div class="flex gap-3 justify-end">
              <button class="btn-ghost" @click="confirmOpen = false">Cancelar</button>
              <button
                class="btn bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
                @click="confirmDelete"
              >
                <i class="fa fa-trash mr-1.5" />Eliminar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
