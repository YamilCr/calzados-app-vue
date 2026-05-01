<script setup lang="ts">
import { useCartStore } from '@/stores/cart'
import CartItemComponent from '@/components/CartItem.vue'

const cart = useCartStore()
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold text-gray-800 mb-8">Shopping Cart</h1>

    <!-- Empty state -->
    <div v-if="cart.items.length === 0" class="text-center py-24">
      <i class="fa fa-cart-arrow-down text-6xl text-gray-300 mb-5" />
      <p class="text-xl font-semibold text-gray-500 mb-2">Your cart is empty</p>
      <p class="text-gray-400 mb-6">Add some products to get started.</p>
      <router-link to="/shop" class="btn-primary text-base px-8 py-3">
        <i class="fa fa-store mr-2" /> Browse Shop
      </router-link>
    </div>

    <!-- Cart content -->
    <div v-else class="grid lg:grid-cols-3 gap-10">

      <!-- Items list -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow-sm p-6">
          <CartItemComponent
            v-for="(item, i) in cart.items"
            :key="`${item.product.id}-${item.selectedSize}-${item.selectedColor.hex}`"
            :item="item"
            :index="i"
            @remove="cart.remove"
            @update-qty="cart.updateQuantity"
          />
        </div>

        <div class="flex justify-between mt-4">
          <router-link to="/shop" class="btn-ghost text-sm">
            <i class="fa fa-arrow-left mr-1" /> Continue Shopping
          </router-link>
          <button class="text-sm text-red-500 hover:text-red-700 transition" @click="cart.clear">
            <i class="fa fa-trash mr-1" /> Clear Cart
          </button>
        </div>
      </div>

      <!-- Order summary -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-sm p-6 sticky top-24">
          <h2 class="text-lg font-bold text-gray-800 mb-5 pb-3 border-b">Order Summary</h2>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between text-gray-600">
              <span>Subtotal ({{ cart.totalItems }} item{{ cart.totalItems !== 1 ? 's' : '' }})</span>
              <span>${{ cart.subtotal.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span :class="cart.shipping === 0 ? 'text-brand font-medium' : ''">
                {{ cart.shipping === 0 ? 'FREE' : `$${cart.shipping.toFixed(2)}` }}
              </span>
            </div>
            <div
              v-if="cart.subtotal < 500"
              class="text-xs text-brand bg-brand/10 rounded p-2"
            >
              <i class="fa fa-truck mr-1" />
              Add ${{ (500 - cart.subtotal).toFixed(2) }} more for free shipping!
            </div>
            <hr />
            <div class="flex justify-between font-bold text-lg text-gray-900">
              <span>Total</span>
              <span>${{ cart.total.toFixed(2) }}</span>
            </div>
          </div>

          <router-link to="/checkout" class="btn-primary w-full mt-6 py-3 text-base">
            Proceed to Checkout <i class="fa fa-arrow-right ml-2" />
          </router-link>

          <!-- Accepted payments -->
          <div class="flex justify-center gap-3 mt-4 text-gray-300">
            <i class="fab fa-cc-visa text-2xl" />
            <i class="fab fa-cc-mastercard text-2xl" />
            <i class="fab fa-cc-paypal text-2xl" />
            <i class="fab fa-cc-amex text-2xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
