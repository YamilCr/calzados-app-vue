<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { productApi } from '@/api/client'
import { MOCK_HERO_SLIDES } from '@/data/mock'

const slides = ref<any[]>([])
const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

// Función para mapear producto a slide
function productToSlide(product: any) {
  return {
    id: product.id,
    title: product.name,
    subtitle: 'Producto destacado',
    description: product.description || 'Descubre este increíble producto.',
    image: product.image,
    ctaLabel: 'Ver producto',
    ctaLink: `/product/${product.slug}`,
  }
}

async function loadSlides() {
  try {
    const products = await productApi.getCarrusel()
    slides.value = products.map(productToSlide)
    if (slides.value.length === 0) {
      // Fallback a mock si no hay productos
      slides.value = MOCK_HERO_SLIDES
    }
  } catch (error) {
    console.error('Error cargando carrusel:', error)
    slides.value = MOCK_HERO_SLIDES
  }
}

function next() {
  current.value = (current.value + 1) % slides.value.length
}
function prev() {
  current.value = (current.value - 1 + slides.value.length) % slides.value.length
}
function goTo(i: number) {
  current.value = i
}

onMounted(async () => {
  await loadSlides()
  timer = setInterval(next, 5000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>