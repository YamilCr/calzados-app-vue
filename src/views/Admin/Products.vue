<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { productApi, catalogApi } from '@/api/client'
import type { Product, ProductPayload, Subcategoria, Color } from '@/api/client'
import { useToast } from '@/composables/useToast'

// const toast = useToast()
const { show: toast } = useToast()
// ─── Estado de tabla / búsqueda ───────────────────────────────────────────────
const products   = ref<Product[]>([])
const loading    = ref(true)
const total      = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const perPage = 8

const search          = ref('')
const categoriaFilter = ref('')
const sortField       = ref<'name' | 'price' | 'category'>('name')
const sortDir         = ref<'asc' | 'desc'>('asc')

// ─── Catálogo (para selects del formulario) ───────────────────────────────────
const subcategorias = ref<Subcategoria[]>([])
const colores       = ref<Color[]>([])

// ─── Listas derivadas para el filtro de categoría ─────────────────────────────
/**
 * El backend trabaja con "categorias" como nombre de la tabla padre.
 * Las subcategorias traen categoria.nombre embebido.
 * Construimos un set único de nombres de categoría desde las subcategorías cargadas.
 */
const categoriasUnicas = computed<string[]>(() => {
  const set = new Set<string>()
  subcategorias.value.forEach((s) => {
    if (s.categoria?.nombre) set.add(s.categoria.nombre)
  })
  return Array.from(set).sort()
})

// ─── Productos filtrados localmente (sort + filtro visual) ────────────────────
const filteredProducts = computed(() => {
  let list = [...products.value]

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    )
  }
  if (categoriaFilter.value)
    list = list.filter((p) => p.category.toLowerCase() === categoriaFilter.value.toLowerCase())

  list.sort((a, b) => {
    const va = String(a[sortField.value as keyof Product] ?? '')
    const vb = String(b[sortField.value as keyof Product] ?? '')
    return sortDir.value === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  return list
})

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredProducts.value.slice(start, start + perPage)
})

const localTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredProducts.value.length / perPage)),
)

function setSort(field: typeof sortField.value) {
  if (sortField.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortField.value = field; sortDir.value = 'asc' }
}

// ─── Cargar datos iniciales ───────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  try {
    const [prodRes, subRes, colRes] = await Promise.all([
      productApi.list({ perPage: 200, page: 1 }),   // traer todos para tabla local
      catalogApi.listSubcategorias(),
      catalogApi.listColores(),
    ])

    products.value    = prodRes.data
    total.value       = prodRes.total
    totalPages.value  = prodRes.totalPages
    subcategorias.value = subRes
    colores.value       = colRes
  } catch (e) {
     toast('Error al cargar productos.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

// ─── Modal / formulario ───────────────────────────────────────────────────────
const modalOpen  = ref(false)
const isEditing  = ref(false)
const editingId  = ref<string | null>(null)
const saving     = ref(false)

const deleteTarget = ref<Product | null>(null)
const confirmOpen  = ref(false)
const deleting     = ref(false)

// Campos del formulario
const fNombre          = ref('')
const fCodigo          = ref('')
const fPrecio          = ref<number>(0)
const fPrecioAnterior  = ref<number | undefined>(undefined)
const fDescripcion     = ref('')
const fSubcategoriaId  = ref<string>('')
const fActivo          = ref(true)
const fDestacado       = ref(false)
const fImagenesUrls    = ref('')   // una URL por línea
const fTalles          = ref('')   // separados por coma
// Colores: selección múltiple de colores registrados en BD
const fColorIds        = ref<string[]>([])
// Talles opcionales por variante (si no se usan variantes con talle específico
// se crean variantes vacías de talle con el color seleccionado)

const formErrors = ref<Record<string, string>>({})

function validate(): boolean {
  formErrors.value = {}
  if (!fNombre.value.trim())   formErrors.value.nombre = 'El nombre es obligatorio.'
  if (!fCodigo.value.trim())   formErrors.value.codigo = 'El código es obligatorio.'
  if (fPrecio.value <= 0)      formErrors.value.precio = 'El precio debe ser mayor a 0.'
  return Object.keys(formErrors.value).length === 0
}

function buildPayload(): ProductPayload {
  const talles = fTalles.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const imagenesUrls = fImagenesUrls.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  // Variantes: una por color seleccionado (sin talle específico)
  const variantes = fColorIds.value.map((color_id) => ({ color_id }))

  return {
    codigo:          fCodigo.value.trim().toUpperCase(),
    nombre:          fNombre.value.trim(),
    descripcion:     fDescripcion.value.trim() || undefined,
    precio:          fPrecio.value,
    precio_anterior: fPrecioAnterior.value ?? null,
    subcategoria_id: fSubcategoriaId.value || null,
    activo:          fActivo.value,
    destacado:       fDestacado.value,
    imagenesUrls:    imagenesUrls.length ? imagenesUrls : undefined,
    talles:          talles.length ? talles : undefined,
    variantes:       variantes.length ? variantes : undefined,
  }
}

function openCreate() {
  isEditing.value = false
  editingId.value = null
  fNombre.value         = ''
  fCodigo.value         = ''
  fPrecio.value         = 0
  fPrecioAnterior.value = undefined
  fDescripcion.value    = ''
  fSubcategoriaId.value = ''
  fActivo.value         = true
  fDestacado.value      = false
  fImagenesUrls.value   = ''
  fTalles.value         = ''
  fColorIds.value       = []
  formErrors.value      = {}
  modalOpen.value       = true
}

function openEdit(product: Product) {
  isEditing.value = true
  editingId.value = product.id
  fNombre.value         = product.name
  fCodigo.value         = product.codigo
  fPrecio.value         = product.price
  fPrecioAnterior.value = product.originalPrice
  fDescripcion.value    = product.description
  fSubcategoriaId.value = '' // no tenemos el id directo en el shape del frontend; se puede dejar vacío o extender el tipo
  fActivo.value         = product.inStock
  fDestacado.value      = product.featured
  fImagenesUrls.value   = product.images.join('\n')
  fTalles.value         = product.sizes.join(', ')
  // Intentar pre-seleccionar colores por nombre
  fColorIds.value = product.colors
    .map((c) => colores.value.find((col) => col.nombre === c.name)?.id ?? '')
    .filter(Boolean)
  formErrors.value = {}
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function saveProduct() {
  // console.log("saveProduct: payload =", buildPayload());
  // const { show: toast } = useToast()
  if (!validate()) return
  saving.value = true
  try {
    const payload = buildPayload()
    if (isEditing.value && editingId.value) {
      await productApi.update(editingId.value, payload)
      toast('Producto actualizado correctamente.', 'success')
    } else {
      await productApi.create(payload)
      toast('Producto creado correctamente.', 'success')
      currentPage.value = 1
    }
    
    closeModal()
    await loadAll()
  } catch (e) {
    
    toast('Error al guardar.', 'error')
  } finally {
    saving.value = false
  }
}

function askDelete(product: Product) {
  deleteTarget.value = product
  confirmOpen.value  = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    // Soft delete (activo = false)
    await productApi.remove(deleteTarget.value.id)
    toast(`"${deleteTarget.value.name}" desactivado.`, 'success')
    if (currentPage.value > localTotalPages.value) currentPage.value = localTotalPages.value
    await loadAll()
  } catch (e) {
    toast('Error al eliminar.', 'error')
  } finally {
    deleting.value     = false
    confirmOpen.value  = false
    deleteTarget.value = null
  }
}

// Helper: color label para selector
function colorLabel(c: Color) {
  return `${c.nombre}${c.codigo_hex ? ` (${c.codigo_hex})` : ''}`
}

function toggleColor(id: string) {
  const idx = fColorIds.value.indexOf(id)
  if (idx === -1) fColorIds.value.push(id)
  else fColorIds.value.splice(idx, 1)
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
          {{ total }} producto{{ total !== 1 ? 's' : '' }} en total
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
        v-model="categoriaFilter"
        class="input w-52"
        @change="currentPage = 1"
      >
        <option value="">Todas las categorías</option>
        <option v-for="cat in categoriasUnicas" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>
    </div>

    <!-- ── Tabla ─────────────────────────────────────────────────────── -->
    <div class="bg-white rounded-xl shadow overflow-hidden">
      <div v-if="loading" class="p-12 text-center text-gray-400 animate-pulse">
        <i class="fa fa-spinner fa-spin text-3xl" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th class="px-4 py-3 text-left w-16">Img</th>
              <th
                class="px-4 py-3 text-left cursor-pointer hover:text-brand transition select-none"
                @click="setSort('name')"
              >
                Nombre
                <i :class="['fa ml-1', sortField === 'name'
                  ? (sortDir === 'asc' ? 'fa-arrow-up text-brand' : 'fa-arrow-down text-brand')
                  : 'fa-sort text-gray-300']" />
              </th>
              <th class="px-4 py-3 text-left">Código</th>
              <th
                class="px-4 py-3 text-left cursor-pointer hover:text-brand transition select-none"
                @click="setSort('category')"
              >
                Categoría
                <i :class="['fa ml-1', sortField === 'category'
                  ? (sortDir === 'asc' ? 'fa-arrow-up text-brand' : 'fa-arrow-down text-brand')
                  : 'fa-sort text-gray-300']" />
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer hover:text-brand transition select-none"
                @click="setSort('price')"
              >
                Precio
                <i :class="['fa ml-1', sortField === 'price'
                  ? (sortDir === 'asc' ? 'fa-arrow-up text-brand' : 'fa-arrow-down text-brand')
                  : 'fa-sort text-gray-300']" />
              </th>
              <th class="px-4 py-3 text-center">Stock</th>
              <th class="px-4 py-3 text-center">Destacado</th>
              <th class="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="paginated.length === 0">
              <td colspan="8" class="px-4 py-12 text-center text-gray-400">
                <i class="fa fa-inbox text-3xl block mb-2" />
                No se encontraron productos.
              </td>
            </tr>
            <tr
              v-for="product in paginated"
              :key="product.id"
              class="hover:bg-gray-50 transition"
            >
              <td class="px-4 py-3">
                <img
                  v-if="product.image"
                  :src="product.image"
                  :alt="product.name"
                  class="w-12 h-12 object-cover rounded-lg border border-gray-200"
                  loading="lazy"
                />
                <div v-else class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                  <i class="fa fa-image text-gray-300" />
                </div>
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900 truncate max-w-[180px]">{{ product.name }}</p>
                <p class="text-xs text-gray-400">{{ product.subcategory }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ product.codigo }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="capitalize">{{ product.category }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <span class="font-semibold text-gray-900">${{ product.price.toFixed(2) }}</span>
                <span v-if="product.originalPrice" class="ml-1 text-xs text-gray-400 line-through">
                  ${{ product.originalPrice.toFixed(2) }}
                </span>
              </td>
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
              <td class="px-4 py-3 text-center">
                <i :class="['fa fa-star', product.featured ? 'text-yellow-400' : 'text-gray-200']" />
              </td>
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
                    title="Desactivar"
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

      <!-- Paginación local -->
      <div
        v-if="localTotalPages > 1"
        class="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500"
      >
        <span>
          Página {{ currentPage }} de {{ localTotalPages }}
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
            v-for="p in localTotalPages"
            :key="p"
            :class="[
              'px-3 py-1 rounded border transition',
              p === currentPage ? 'bg-brand text-white border-brand' : 'hover:bg-gray-50',
            ]"
            @click="currentPage = p"
          >
            {{ p }}
          </button>
          <button
            class="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="currentPage === localTotalPages"
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
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-lg font-bold text-gray-900">
                <i :class="['fa mr-2 text-brand', isEditing ? 'fa-pen-to-square' : 'fa-plus-circle']" />
                {{ isEditing ? 'Editar Producto' : 'Nuevo Producto' }}
              </h2>
              <button class="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" @click="closeModal">
                <i class="fa fa-xmark text-lg" />
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-5">

              <!-- Nombre -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span class="text-red-500">*</span>
                </label>
                <input v-model="fNombre" type="text" class="input" placeholder="Ej: Zapatilla Running Pro" />
                <p v-if="formErrors.nombre" class="text-red-500 text-xs mt-1">{{ formErrors.nombre }}</p>
              </div>

              <!-- Código / Precio / Precio anterior -->
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Código <span class="text-red-500">*</span>
                  </label>
                  <input v-model="fCodigo" type="text" class="input uppercase" placeholder="Ej: ZAP001" :disabled="isEditing" />
                  <p v-if="formErrors.codigo" class="text-red-500 text-xs mt-1">{{ formErrors.codigo }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Precio <span class="text-red-500">*</span>
                  </label>
                  <input v-model.number="fPrecio" type="number" min="0" step="0.01" class="input" />
                  <p v-if="formErrors.precio" class="text-red-500 text-xs mt-1">{{ formErrors.precio }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Precio anterior</label>
                  <input v-model.number="fPrecioAnterior" type="number" min="0" step="0.01" class="input" placeholder="Opcional" />
                </div>
              </div>

              <!-- Subcategoría -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
                <select v-model="fSubcategoriaId" class="input">
                  <option value="">— Sin subcategoría —</option>
                  <optgroup
                    v-for="cat in categoriasUnicas"
                    :key="cat"
                    :label="cat"
                  >
                    <option
                      v-for="sub in subcategorias.filter((s) => s.categoria?.nombre === cat)"
                      :key="sub.id"
                      :value="sub.id"
                    >
                      {{ sub.nombre }}
                    </option>
                  </optgroup>
                </select>
              </div>

              <!-- Descripción -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea v-model="fDescripcion" class="input resize-none" rows="3" placeholder="Descripción del producto..." />
              </div>

              <!-- Imágenes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  URLs de imágenes
                  <span class="text-gray-400 font-normal">(una por línea; la primera será la imagen principal)</span>
                </label>
                <textarea v-model="fImagenesUrls" class="input resize-none" rows="3" placeholder="https://imagen1.com&#10;https://imagen2.com" />
              </div>

              <!-- Talles -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Talles
                  <span class="text-gray-400 font-normal">(separados por coma)</span>
                </label>
                <input v-model="fTalles" type="text" class="input" placeholder="Ej: 38, 39, 40, 41" />
              </div>

              <!-- Colores (selección múltiple desde BD) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Colores
                  <span class="text-gray-400 font-normal">(seleccioná uno o más)</span>
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="color in colores"
                    :key="color.id"
                    type="button"
                    :class="[
                      'flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition',
                      fColorIds.includes(color.id)
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-gray-200 text-gray-600 hover:border-brand',
                    ]"
                    @click="toggleColor(color.id)"
                  >
                    <span
                      v-if="color.codigo_hex"
                      class="w-3 h-3 rounded-full border border-gray-300 inline-block shrink-0"
                      :style="{ backgroundColor: color.codigo_hex }"
                    />
                    {{ color.nombre }}
                    <i v-if="fColorIds.includes(color.id)" class="fa fa-check text-[10px]" />
                  </button>
                  <span v-if="colores.length === 0" class="text-xs text-gray-400 italic">
                    No hay colores registrados aún.
                  </span>
                </div>
              </div>

              <!-- Toggles -->
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input v-model="fActivo" type="checkbox" class="w-4 h-4 rounded accent-brand" />
                  <span class="text-sm font-medium text-gray-700">En stock / Activo</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input v-model="fDestacado" type="checkbox" class="w-4 h-4 rounded accent-brand" />
                  <span class="text-sm font-medium text-gray-700">Destacado</span>
                </label>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button class="btn-ghost" @click="closeModal">Cancelar</button>
              <button class="btn-primary" :disabled="saving" @click="saveProduct">
                <i :class="['fa mr-1.5', saving ? 'fa-spinner fa-spin' : isEditing ? 'fa-floppy-disk' : 'fa-plus']" />
                {{ isEditing ? 'Guardar cambios' : 'Crear producto' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- Diálogo confirmar desactivar                                        -->
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
              <h3 class="font-bold text-gray-900">Desactivar producto</h3>
            </div>
            <p class="text-sm text-gray-600 mb-6">
              ¿Desactivar <strong>{{ deleteTarget?.name }}</strong>?
              El producto quedará inactivo y no aparecerá en la tienda, pero se conserva en la base de datos.
            </p>
            <div class="flex gap-3 justify-end">
              <button class="btn-ghost" :disabled="deleting" @click="confirmOpen = false">Cancelar</button>
              <button
                class="btn bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
                :disabled="deleting"
                @click="confirmDelete"
              >
                <i :class="['fa mr-1.5', deleting ? 'fa-spinner fa-spin' : 'fa-trash']" />
                Desactivar
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
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>
