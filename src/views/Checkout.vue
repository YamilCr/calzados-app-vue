<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToast } from '@/composables/useToast'
// import { orderApi } from '@/api/client'
import type { ShippingAddress } from '@/types'

const router = useRouter()
const cart = useCartStore()
const { show } = useToast()

const submitting = ref(false)
const step = ref<1 | 2>(1)

const address = reactive<ShippingAddress>({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
})

async function placeOrder() {
  if (cart.items.length === 0) return
  submitting.value = true
  try {
    await orderApi.create({
      items: cart.items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        size: i.selectedSize,
        color: i.selectedColor.name,
      })),
      shippingAddress: { ...address },
    })
    cart.clear()
    show('Order placed successfully!', 'success')
    router.push('/orders')
  } catch {
    show('Failed to place order. Please try again.', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold text-gray-800 mb-8">Checkout</h1>

    <!-- Empty cart guard -->
    <div v-if="cart.items.length === 0" class="text-center py-20">
      <i class="fa fa-cart-arrow-down text-6xl text-gray-300 mb-4" />
      <p class="text-lg text-gray-500 mb-4">Your cart is empty.</p>
      <router-link to="/shop" class="btn-primary">Back to Shop</router-link>
    </div>

    <div v-else class="grid lg:grid-cols-3 gap-10">

      <!-- Checkout form -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Step indicator -->
        <div class="flex gap-2 mb-4">
          <span
            v-for="(label, i) in ['Shipping', 'Review & Pay']"
            :key="i"
            :class="[
              'px-4 py-1.5 rounded-full text-sm font-medium transition',
              step === i + 1 ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500',
            ]"
          >
            {{ i + 1 }}. {{ label }}
          </span>
        </div>

        <!-- Step 1: Shipping address -->
        <div v-if="step === 1" class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-bold text-gray-800 mb-5">Shipping Address</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input v-model="address.firstName" class="input" placeholder="John" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input v-model="address.lastName" class="input" placeholder="Doe" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input v-model="address.email" type="email" class="input" placeholder="john@example.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input v-model="address.phone" class="input" placeholder="555-0100" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
              <input v-model="address.address" class="input" placeholder="123 Main Street" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input v-model="address.city" class="input" placeholder="New York" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
              <input v-model="address.state" class="input" placeholder="NY" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ZIP / Postal Code *</label>
              <input v-model="address.zipCode" class="input" placeholder="10001" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input v-model="address.country" class="input" placeholder="United States" />
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <button
              class="btn-primary px-8 py-3"
              :disabled="!address.firstName || !address.lastName || !address.email || !address.address || !address.city || !address.zipCode || !address.country"
              @click="step = 2"
            >
              Continue to Review <i class="fa fa-arrow-right ml-2" />
            </button>
          </div>
        </div>

        <!-- Step 2: Review -->
        <div v-if="step === 2" class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-gray-800">Review Your Order</h2>
            <button class="text-sm text-brand hover:underline" @click="step = 1">
              Edit Address
            </button>
          </div>

          <!-- Address summary -->
          <div class="bg-gray-50 rounded p-4 text-sm text-gray-600 mb-5">
            <p class="font-medium text-gray-800 mb-1">{{ address.firstName }} {{ address.lastName }}</p>
            <p>{{ address.address }}, {{ address.city }} {{ address.zipCode }}</p>
            <p>{{ address.country }}</p>
            <p class="mt-1">{{ address.email }}</p>
          </div>

          <!-- Items list -->
          <div class="divide-y">
            <div
              v-for="item in cart.items"
              :key="`${item.product.id}-${item.selectedSize}`"
              class="flex gap-4 py-3"
            >
              <img :src="item.product.image" :alt="item.product.name" class="w-14 h-14 rounded object-cover" />
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">{{ item.product.name }}</p>
                <p class="text-xs text-gray-400">{{ item.selectedSize }} · {{ item.selectedColor.name }} · Qty {{ item.quantity }}</p>
              </div>
              <p class="font-semibold text-gray-800 text-sm">${{ (item.product.price * item.quantity).toFixed(2) }}</p>
            </div>
          </div>

          <!-- Payment (mock) -->
          <div class="mt-5 pt-4 border-t">
            <h3 class="font-semibold text-gray-700 mb-3">Payment Method</h3>
            <div class="flex gap-3 flex-wrap">
              <label
                v-for="pm in ['Credit Card', 'PayPal', 'Crypto']"
                :key="pm"
                class="flex items-center gap-2 cursor-pointer border border-gray-200 rounded px-3 py-2 text-sm hover:border-brand transition"
              >
                <input type="radio" name="payment" :value="pm" class="accent-brand" checked />
                {{ pm }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Summary sticky -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-sm p-6 sticky top-24">
          <h2 class="text-lg font-bold text-gray-800 mb-4 pb-3 border-b">Summary</h2>
          <div class="space-y-2 text-sm text-gray-600">
            <div class="flex justify-between">
              <span>Subtotal</span>
              <span>${{ cart.subtotal.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Shipping</span>
              <span :class="cart.shipping === 0 ? 'text-brand' : ''">
                {{ cart.shipping === 0 ? 'FREE' : `$${cart.shipping.toFixed(2)}` }}
              </span>
            </div>
            <hr />
            <div class="flex justify-between font-bold text-base text-gray-900">
              <span>Total</span>
              <span>${{ cart.total.toFixed(2) }}</span>
            </div>
          </div>

          <button
            v-if="step === 2"
            :disabled="submitting"
            class="btn-primary w-full mt-5 py-3 text-base"
            @click="placeOrder"
          >
            <i :class="['fa mr-2', submitting ? 'fa-spinner fa-spin' : 'fa-lock']" />
            {{ submitting ? 'Placing Order...' : 'Place Order' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
