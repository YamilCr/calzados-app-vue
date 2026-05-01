<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useToast } from '@/composables/useToast'

const { show } = useToast()

const form = reactive({ name: '', email: '', subject: '', message: '' })
const submitting = ref(false)

async function submit() {
  submitting.value = true
  await new Promise((r) => setTimeout(r, 800)) // mock delay
  show('Message sent! We\'ll get back to you within 24h.', 'success')
  Object.assign(form, { name: '', email: '', subject: '', message: '' })
  submitting.value = false
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-14">
    <div class="text-center mb-12">
      <h1 class="text-3xl font-bold text-gray-800">Get In Touch</h1>
      <p class="text-gray-500 mt-2 max-w-md mx-auto">
        Questions, feedback, or just want to say hi? We'd love to hear from you.
      </p>
    </div>

    <div class="grid md:grid-cols-2 gap-14">

      <!-- Contact info -->
      <div>
        <div class="space-y-6">
          <div
            v-for="item in [
              { icon: 'fa-map-marker-alt', title: 'Address', text: '123 Consectetur at ligula, 10660' },
              { icon: 'fa-phone', title: 'Phone', text: '010-020-0340' },
              { icon: 'fa-envelope', title: 'Email', text: 'info@zayshop.com' },
              { icon: 'fa-clock', title: 'Hours', text: 'Mon–Fri 9am – 6pm EST' },
            ]" :key="item.title"
            class="flex gap-4 items-start"
          >
            <div class="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center shrink-0">
              <i :class="['fa', item.icon, 'text-brand']" />
            </div>
            <div>
              <p class="font-semibold text-gray-800">{{ item.title }}</p>
              <p class="text-gray-500 text-sm">{{ item.text }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact form -->
      <div class="bg-white rounded-xl shadow-sm p-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input v-model="form.name" class="input" placeholder="Your name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input v-model="form.email" type="email" class="input" placeholder="you@example.com" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input v-model="form.subject" class="input" placeholder="What is it about?" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              v-model="form.message"
              rows="5"
              class="input resize-none"
              placeholder="Your message..."
            />
          </div>
        </div>
        <button
          :disabled="submitting || !form.name || !form.email || !form.message"
          class="btn-primary w-full mt-5 py-3 text-base"
          @click="submit"
        >
          <i :class="['fa mr-2', submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane']" />
          {{ submitting ? 'Sending...' : 'Send Message' }}
        </button>
      </div>
    </div>
  </div>
</template>
