<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { productApi, catalogApi } from '@/api/client'
import type { Product, ProductPayload, Subcategoria, Color } from '@/api/client'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const toastSuccess = (msg: string) => (toast as any).success?.(msg) ?? (toast as any).show?.(msg, 'success')
const toastError   = (msg: string) => (toast as any).error?.(msg)   ?? (toast as any).show?.(msg, 'error')

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000')

// ─── Estado tabla ─────────────────────────────────────────────────────────────
const products    = ref<Product[]>([])
const loading     = ref(true)
const total       = ref(0)
const currentPage = ref(1)
const perPage     = 8

const search          = ref('')
const categoriaFilter = ref('')
const sortField       = ref<'name' | 'price' | 'category'>('name')
const sortDir         = ref<'asc' | 'desc'>('asc')

// ─── Catálogo ─────────────────────────────────────────────────────────────────
const subcategorias = ref<Subcategoria[]>([])
const colores       = ref<Color[]>([])

const categoriasUnicas = computed<string[]>(() => {
  const set = new Set<string>()
  subcategorias.value.forEach((s) => { if (s.categoria?.nombre) set.add(s.categoria.nombre) })
  return Array.from(set).sort()
})

// ─── Filtrado / paginación local ──────────────────────────────────────────────
const filteredProducts = computed(() => {
  let list = [...products.value]
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
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

const localTotalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / perPage)))

function setSort(field: typeof sortField.value) {
  if (sortField.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortField.value = field; sortDir.value = 'asc' }
}

// ─── Carga inicial ────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  try {
    const [prodRes, subRes, colRes] = await Promise.all([
      productApi.list({ perPage: 200, page: 1 }),
      catalogApi.listSubcategorias(),
      catalogApi.listColores(),
    ])
    products.value      = prodRes.data
    total.value         = prodRes.total
    subcategorias.value = subRes
    colores.value       = colRes
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Error al cargar.')
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

// ─── Upload de imagen ─────────────────────────────────────────────────────────
const uploading       = ref(false)
const uploadProgress  = ref(0)
const imageFile       = ref<File | null>(null)
const imagePreview    = ref('')

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value    = file
  imagePreview.value = URL.createObjectURL(file)
}

async function uploadImage(file: File): Promise<string> {
  uploading.value      = true
  uploadProgress.value = 0

  const formData = new FormData()
  formData.append('imagen', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}/upload/imagen`)

    const token = localStorage.getItem('auth_token')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
    })

    xhr.onload = () => {
      uploading.value = false
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText)
        resolve(res.url)
      } else {
        const res = JSON.parse(xhr.responseText)
        reject(new Error(res.message ?? 'Error al subir imagen'))
      }
    }
    xhr.onerror = () => { uploading.value = false; reject(new Error('Error de red')) }
    xhr.send(formData)
  })
}

function clearImage() {
  imageFile.value      = null
  imagePreview.value   = ''
  fImagenPrincipal.value = ''
  uploadProgress.value = 0
}

// ─── Formulario ───────────────────────────────────────────────────────────────
const modalOpen  = ref(false)
const isEditing  = ref(false)
const editingId  = ref<string | null>(null)
const saving     = ref(false)

const deleteTarget = ref<Product | null>(null)
const confirmOpen  = ref(false)
const deleting     = ref(false)

const fNombre          = ref('')
const fCodigo          = ref('')
const fPrecio          = ref<number>(0)
const fPrecioAnterior  = ref<number | undefined>(undefined)
const fDescripcion     = ref('')
const fSubcategoriaId  = ref('')
const fActivo          = ref(true)
const fDestacado       = ref(false)
const fTalles          = ref('')
const fColorIds        = ref<string[]>([])
const fImagenPrincipal = ref('')   // URL final tras upload
const fImagenesUrls    = ref('')   // imágenes adicionales (una por línea)

const formErrors = ref<Record<string, string>>({})

function validate(): boolean {
  formErrors.value = {}
  if (!fNombre.value.trim()) formErrors.value.nombre = 'El nombre es obligatorio.'
  if (!fCodigo.value.trim()) formErrors.value.codigo = 'El código es obligatorio.'
  if (fPrecio.value <= 0)    formErrors.value.precio = 'El precio debe ser mayor a 0.'
  return Object.keys(formErrors.value).length === 0
}

function buildPayload(): ProductPayload {
  const talles = fTalles.value.split(',').map((s) => s.trim()).filter(Boolean)
  const adicionales = fImagenesUrls.value.split('\n').map((s) => s.trim()).filter(Boolean)
  const todasImagenes = [...(fImagenPrincipal.value ? [fImagenPrincipal.value] : []), ...adicionales]
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
    imagenesUrls:    todasImagenes.length ? todasImagenes : undefined,
    talles:          talles.length ? talles : undefined,
    variantes:       variantes.length ? variantes : undefined,
  }
}

function resetForm() {
  fNombre.value = ''; fCodigo.value = ''; fPrecio.value = 0
  fPrecioAnterior.value = undefined; fDescripcion.value = ''
  fSubcategoriaId.value = ''; fActivo.value = true; fDestacado.value = false
  fTalles.value = ''; fColorIds.value = []
  fImagenPrincipal.value = ''; fImagenesUrls.value = ''
  imageFile.value = null; imagePreview.value = ''; uploadProgress.value = 0
  formErrors.value = {}
}

function openCreate() {
  isEditing.value = false; editingId.value = null
  resetForm(); modalOpen.value = true
}

function openEdit(product: Product) {
  isEditing.value        = true
  editingId.value        = product.id
  fNombre.value          = product.name
  fCodigo.value          = product.codigo
  fPrecio.value          = product.price
  fPrecioAnterior.value  = product.originalPrice
  fDescripcion.value     = product.description
  fSubcategoriaId.value  = ''
  fActivo.value          = product.inStock
  fDestacado.value       = product.featured
  fImagenPrincipal.value = product.image
  imagePreview.value     = product.image   // mostrar la imagen actual como preview
  imageFile.value        = null            // sin archivo nuevo
  fImagenesUrls.value    = product.images.slice(1).join('\n')
  fTalles.value          = product.sizes.join(', ')
  fColorIds.value        = product.colors
    .map((c) => colores.value.find((col) => col.nombre === c.name)?.id ?? '')
    .filter(Boolean)
  formErrors.value = {}
  modalOpen.value  = true
}

function closeModal() { modalOpen.value = false }

async function saveProduct() {
  if (!validate()) return
  saving.value = true
  try {
    // Si hay un archivo nuevo, subirlo primero y obtener la URL
    if (imageFile.value) {
      fImagenPrincipal.value = await uploadImage(imageFile.value)
    }

    const payload = buildPayload()

    if (isEditing.value && editingId.value) {
      await productApi.update(editingId.value, payload)
      toastSuccess('Producto actualizado correctamente.')
    } else {
      await productApi.create(payload)
      toastSuccess('Producto creado correctamente.')
      currentPage.value = 1
    }
    closeModal()
    await loadAll()
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Error al guardar.')
  } finally {
    saving.value = false
  }
}

function askDelete(product: Product) { deleteTarget.value = product; confirmOpen.value = true }

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await productApi.remove(deleteTarget.value.id)
    toastSuccess(`"${deleteTarget.value.name}" desactivado.`)
    if (currentPage.value > localTotalPages.value) currentPage.value = localTotalPages.value
    await loadAll()
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Error al eliminar.')
  } finally {
    deleting.value = false; confirmOpen.value = false; deleteTarget.value = null
  }
}

function toggleColor(id: string) {
  const idx = fColorIds.value.indexOf(id)
  if (idx === -1) fColorIds.value.push(id)
  else fColorIds.value.splice(idx, 1)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">

    <!-- Cabecera -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          <i class="fa fa-box-open text-brand mr-2" />Gestión de Productos
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ total }} producto{{ total !== 1 ? 's' : '' }} en total</p>
      </div>
      <button class="btn-primary gap-2" @click="openCreate">
        <i class="fa fa-plus" />Nuevo Producto
      </button>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3 mb-5">
      <div class="relative flex-1 min-w-[200px]">
        <i class="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input v-model="search" type="text" placeholder="Buscar por nombre o categoría…" class="input pl-9" @input="currentPage = 1" />
      </div>
      <select v-model="categoriaFilter" class="input w-52" @change="currentPage = 1">
        <option value="">Todas las categorías</option>
        <option v-for="cat in categoriasUnicas" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl shadow overflow-hidden">
      <div v-if="loading" class="p-12 text-center text-gray-400">
        <i class="fa fa-spinner fa-spin text-3xl" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th class="px-4 py-3 text-left w-16">Img</th>
              <th class="px-4 py-3 text-left cursor-pointer hover:text-brand transition select-none" @click="setSort('name')">
                Nombre <i :class="['fa ml-1', sortField==='name'?(sortDir==='asc'?'fa-arrow-up text-brand':'fa-arrow-down text-brand'):'fa-sort text-gray-300']" />
              </th>
              <th class="px-4 py-3 text-left">Código</th>
              <th class="px-4 py-3 text-left cursor-pointer hover:text-brand transition select-none" @click="setSort('category')">
                Categoría <i :class="['fa ml-1', sortField==='category'?(sortDir==='asc'?'fa-arrow-up text-brand':'fa-arrow-down text-brand'):'fa-sort text-gray-300']" />
              </th>
              <th class="px-4 py-3 text-right cursor-pointer hover:text-brand transition select-none" @click="setSort('price')">
                Precio <i :class="['fa ml-1', sortField==='price'?(sortDir==='asc'?'fa-arrow-up text-brand':'fa-arrow-down text-brand'):'fa-sort text-gray-300']" />
              </th>
              <th class="px-4 py-3 text-center">Stock</th>
              <th class="px-4 py-3 text-center">Destacado</th>
              <th class="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="paginated.length === 0">
              <td colspan="8" class="px-4 py-12 text-center text-gray-400">
                <i class="fa fa-inbox text-3xl block mb-2" />No se encontraron productos.
              </td>
            </tr>
            <tr v-for="product in paginated" :key="product.id" class="hover:bg-gray-50 transition">
              <td class="px-4 py-3">
                <img v-if="product.image" :src="product.image" :alt="product.name" class="w-12 h-12 object-cover rounded-lg border border-gray-200" loading="lazy" />
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
              <td class="px-4 py-3 capitalize">{{ product.category }}</td>
              <td class="px-4 py-3 text-right">
                <span class="font-semibold text-gray-900">${{ product.price.toFixed(2) }}</span>
                <span v-if="product.originalPrice" class="ml-1 text-xs text-gray-400 line-through">${{ product.originalPrice.toFixed(2) }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', product.inStock?'bg-green-100 text-green-700':'bg-red-100 text-red-600']">
                  <i :class="['fa text-[9px]', product.inStock?'fa-circle-check':'fa-circle-xmark']" />
                  {{ product.inStock ? 'Disponible' : 'Sin stock' }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <i :class="['fa fa-star', product.featured?'text-yellow-400':'text-gray-200']" />
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button class="p-1.5 rounded hover:bg-brand/10 text-gray-500 hover:text-brand transition" @click="openEdit(product)">
                    <i class="fa fa-pen-to-square" />
                  </button>
                  <button class="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition" @click="askDelete(product)">
                    <i class="fa fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="localTotalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
        <span>Página {{ currentPage }} de {{ localTotalPages }} ({{ filteredProducts.length }} resultados)</span>
        <div class="flex gap-1">
          <button class="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition" :disabled="currentPage===1" @click="currentPage--">
            <i class="fa fa-chevron-left" />
          </button>
          <button v-for="p in localTotalPages" :key="p"
            :class="['px-3 py-1 rounded border transition', p===currentPage?'bg-brand text-white border-brand':'hover:bg-gray-50']"
            @click="currentPage=p">{{ p }}</button>
          <button class="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition" :disabled="currentPage===localTotalPages" @click="currentPage++">
            <i class="fa fa-chevron-right" />
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ Modal Crear / Editar ════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4" @mousedown.self="closeModal">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl">

            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-lg font-bold text-gray-900">
                <i :class="['fa mr-2 text-brand', isEditing?'fa-pen-to-square':'fa-plus-circle']" />
                {{ isEditing ? 'Editar Producto' : 'Nuevo Producto' }}
              </h2>
              <button class="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" @click="closeModal">
                <i class="fa fa-xmark text-lg" />
              </button>
            </div>

            <div class="px-6 py-5 space-y-5">

              <!-- ── Imagen principal con upload ──────────────────────── -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Imagen principal</label>

                <!-- Zona de click / drop -->
                <label
                  class="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition overflow-hidden"
                  :class="imagePreview ? 'border-brand/40 bg-brand/5' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'"
                >
                  <!-- Preview -->
                  <img v-if="imagePreview" :src="imagePreview" alt="preview" class="absolute inset-0 w-full h-full object-contain p-2" />

                  <!-- Overlay hover para cambiar -->
                  <div v-if="imagePreview" class="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
                    <i class="fa fa-camera text-white text-2xl" />
                    <span class="text-white text-sm font-medium">Cambiar imagen</span>
                  </div>

                  <!-- Placeholder -->
                  <div v-if="!imagePreview" class="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
                    <i class="fa fa-cloud-arrow-up text-4xl" />
                    <span class="text-sm">Hacé click para subir una imagen</span>
                    <span class="text-xs">JPG, PNG, WEBP · máx 5MB</span>
                  </div>

                  <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
                </label>

                <!-- Barra de progreso -->
                <div v-if="uploading" class="mt-2">
                  <div class="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Subiendo…</span><span>{{ uploadProgress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-1.5">
                    <div class="bg-brand h-1.5 rounded-full transition-all" :style="{ width: uploadProgress + '%' }" />
                  </div>
                </div>

                <!-- Quitar imagen -->
                <button v-if="imagePreview && !uploading" type="button" class="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1" @click="clearImage">
                  <i class="fa fa-xmark" /> Quitar imagen
                </button>
              </div>

              <!-- ── Imágenes adicionales ──────────────────────────────── -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Imágenes adicionales <span class="text-gray-400 font-normal">(una URL por línea)</span>
                </label>
                <textarea v-model="fImagenesUrls" class="input resize-none" rows="3" placeholder="https://imagen2.com&#10;https://imagen3.com" />
              </div>

              <!-- ── Nombre ────────────────────────────────────────────── -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="fNombre" type="text" class="input" placeholder="Ej: Zapatilla Running Pro" />
                <p v-if="formErrors.nombre" class="text-red-500 text-xs mt-1">{{ formErrors.nombre }}</p>
              </div>

              <!-- ── Código / Precio / Precio anterior ────────────────── -->
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Código <span class="text-red-500">*</span></label>
                  <input v-model="fCodigo" type="text" class="input uppercase" placeholder="ZAP001" :disabled="isEditing" />
                  <p v-if="formErrors.codigo" class="text-red-500 text-xs mt-1">{{ formErrors.codigo }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Precio <span class="text-red-500">*</span></label>
                  <input v-model.number="fPrecio" type="number" min="0" step="0.01" class="input" />
                  <p v-if="formErrors.precio" class="text-red-500 text-xs mt-1">{{ formErrors.precio }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Precio anterior</label>
                  <input v-model.number="fPrecioAnterior" type="number" min="0" step="0.01" class="input" placeholder="Opcional" />
                </div>
              </div>

              <!-- ── Subcategoría ─────────────────────────────────────── -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
                <select v-model="fSubcategoriaId" class="input">
                  <option value="">— Sin subcategoría —</option>
                  <optgroup v-for="cat in categoriasUnicas" :key="cat" :label="cat">
                    <option v-for="sub in subcategorias.filter((s) => s.categoria?.nombre === cat)" :key="sub.id" :value="sub.id">
                      {{ sub.nombre }}
                    </option>
                  </optgroup>
                </select>
              </div>

              <!-- ── Descripción ───────────────────────────────────────── -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea v-model="fDescripcion" class="input resize-none" rows="3" placeholder="Descripción del producto..." />
              </div>

              <!-- ── Talles ────────────────────────────────────────────── -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Talles <span class="text-gray-400 font-normal">(separados por coma)</span>
                </label>
                <input v-model="fTalles" type="text" class="input" placeholder="Ej: 38, 39, 40, 41" />
              </div>

              <!-- ── Colores ───────────────────────────────────────────── -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Colores <span class="text-gray-400 font-normal">(seleccioná uno o más)</span>
                </label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="color in colores" :key="color.id" type="button"
                    :class="['flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition',
                      fColorIds.includes(color.id)?'border-brand bg-brand/10 text-brand':'border-gray-200 text-gray-600 hover:border-brand']"
                    @click="toggleColor(color.id)"
                  >
                    <span v-if="color.codigo_hex" class="w-3 h-3 rounded-full border border-gray-300 shrink-0" :style="{ backgroundColor: color.codigo_hex }" />
                    {{ color.nombre }}
                    <i v-if="fColorIds.includes(color.id)" class="fa fa-check text-[10px]" />
                  </button>
                  <span v-if="colores.length === 0" class="text-xs text-gray-400 italic">No hay colores registrados.</span>
                </div>
              </div>

              <!-- ── Toggles ───────────────────────────────────────────── -->
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
              <button class="btn-primary" :disabled="saving || uploading" @click="saveProduct">
                <i :class="['fa mr-1.5', (saving||uploading)?'fa-spinner fa-spin':isEditing?'fa-floppy-disk':'fa-plus']" />
                {{ uploading ? 'Subiendo imagen…' : saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear producto' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════ Confirmar desactivar ════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @mousedown.self="confirmOpen = false">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <i class="fa fa-triangle-exclamation text-red-500" />
              </div>
              <h3 class="font-bold text-gray-900">Desactivar producto</h3>
            </div>
            <p class="text-sm text-gray-600 mb-6">
              ¿Desactivar <strong>{{ deleteTarget?.name }}</strong>? El producto quedará inactivo y no aparecerá en la tienda.
            </p>
            <div class="flex gap-3 justify-end">
              <button class="btn-ghost" :disabled="deleting" @click="confirmOpen = false">Cancelar</button>
              <button class="btn bg-red-500 text-white hover:bg-red-600 focus:ring-red-400" :disabled="deleting" @click="confirmDelete">
                <i :class="['fa mr-1.5', deleting?'fa-spinner fa-spin':'fa-trash']" />Desactivar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
