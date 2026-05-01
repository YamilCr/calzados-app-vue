/**
 * API Client
 *
 * Centralised HTTP layer. All network calls go through here.
 * Toggle `USE_MOCK` to switch between real API and local mock data.
 *
 * To integrate a real backend:
 *   1. Set USE_MOCK = false
 *   2. Set BASE_URL to your API root
 *   3. Replace mock implementations with real fetch calls
 */

import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductFilters,
  Order,
  ShippingAddress,
  User,
} from '@/types'
import {
  MOCK_PRODUCTS,
  MOCK_ORDERS,
  MOCK_USER,
} from '@/data/mock'

// ─── Config ───────────────────────────────────────────────────────────────────
const USE_MOCK = true // ← flip to false when backend is ready
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://api.example.com/v1'

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function http<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('auth_token')

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'Unknown API error')
  }

  return res.json()
}

// ─── Mock delay helper ────────────────────────────────────────────────────────
function delay(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function ok<T>(data: T): ApiResponse<T> {
  return { data, success: true }
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const productApi = {
  async list(
    filters: ProductFilters = {},
  ): Promise<PaginatedResponse<Product>> {
    if (USE_MOCK) {
      await delay()
      let items = [...MOCK_PRODUCTS]

      if (filters.category)
        items = items.filter((p) => p.category === filters.category)
      if (filters.gender)
        items = items.filter((p) => p.gender === filters.gender || p.gender === 'unisex')
      if (filters.search) {
        const q = filters.search.toLowerCase()
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.tags.some((t) => t.includes(q)),
        )
      }
      if (filters.minPrice !== undefined)
        items = items.filter((p) => p.price >= filters.minPrice!)
      if (filters.maxPrice !== undefined)
        items = items.filter((p) => p.price <= filters.maxPrice!)

      // Sorting
      switch (filters.sortBy) {
        case 'price_asc':
          items.sort((a, b) => a.price - b.price)
          break
        case 'price_desc':
          items.sort((a, b) => b.price - a.price)
          break
        case 'name_asc':
          items.sort((a, b) => a.name.localeCompare(b.name))
          break
        case 'rating':
          items.sort((a, b) => b.rating - a.rating)
          break
        default:
          items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
      }

      const page = filters.page ?? 1
      const perPage = filters.perPage ?? 9
      const start = (page - 1) * perPage
      const paginated = items.slice(start, start + perPage)

      return {
        data: paginated,
        total: items.length,
        page,
        perPage,
        totalPages: Math.ceil(items.length / perPage),
      }
    }

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v))
    })
    const res = await http<PaginatedResponse<Product>>(`/products?${params}`)
    return res.data
  },

  async getBySlug(slug: string): Promise<Product> {
    if (USE_MOCK) {
      await delay()
      const p = MOCK_PRODUCTS.find((p) => p.slug === slug)
      if (!p) throw new Error('Product not found')
      return p
    }
    const res = await http<Product>(`/products/${slug}`)
    return res.data
  },

  async getFeatured(): Promise<Product[]> {
    if (USE_MOCK) {
      await delay(200)
      return MOCK_PRODUCTS.filter((p) => p.featured)
    }
    const res = await http<Product[]>('/products/featured')
    return res.data
  },
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orderApi = {
  async list(): Promise<Order[]> {
    if (USE_MOCK) {
      await delay()
      return MOCK_ORDERS
    }
    const res = await http<Order[]>('/orders')
    return res.data
  },

  async getById(id: string): Promise<Order> {
    if (USE_MOCK) {
      await delay()
      const o = MOCK_ORDERS.find((o) => o.id === id)
      if (!o) throw new Error('Order not found')
      return o
    }
    const res = await http<Order>(`/orders/${id}`)
    return res.data
  },

  async create(payload: {
    items: Array<{ productId: number; quantity: number; size: string; color: string }>
    shippingAddress: ShippingAddress
  }): Promise<Order> {
    if (USE_MOCK) {
      await delay(600)
      const newOrder: Order = {
        id: `ORD-${Date.now()}`,
        items: payload.items.map((i) => {
          const product = MOCK_PRODUCTS.find((p) => p.id === i.productId)!
          return {
            product,
            quantity: i.quantity,
            selectedSize: i.size,
            selectedColor: product.colors[0],
          }
        }),
        total: payload.items.reduce((sum, i) => {
          const p = MOCK_PRODUCTS.find((p) => p.id === i.productId)!
          return sum + p.price * i.quantity
        }, 0),
        status: 'pending',
        createdAt: new Date().toISOString(),
        shippingAddress: payload.shippingAddress,
      }
      return newOrder
    }
    const res = await http<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res.data
  },
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      await delay(500)
      if (email === 'demo@example.com' && password === 'demo1234') {
        const token = 'mock_jwt_token_' + Date.now()
        return { user: MOCK_USER, token }
      }
      throw new Error('Invalid credentials. Use demo@example.com / demo1234')
    }
    const res = await http<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return res.data
  },

  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      await delay(500)
      const token = 'mock_jwt_token_' + Date.now()
      return { user: { ...MOCK_USER, name, email }, token }
    }
    const res = await http<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    return res.data
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      await delay(100)
      return
    }
    await http('/auth/logout', { method: 'POST' })
  },

  async me(): Promise<User> {
    if (USE_MOCK) {
      await delay()
      return MOCK_USER
    }
    const res = await http<User>('/auth/me')
    return res.data
  },
}
