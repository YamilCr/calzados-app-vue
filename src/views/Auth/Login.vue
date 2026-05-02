<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// ─── Form state ───────────────────────────────────────────────────────────────
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const activeTab = ref<'login' | 'register'>('login')

// Register fields
const registerName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerConfirm = ref('')
const showRegisterPassword = ref(false)

// ─── Validation ───────────────────────────────────────────────────────────────
const loginErrors = ref({ email: '', password: '', api: '' })
const registerErrors = ref({ name: '', email: '', password: '', confirm: '', api: '' })

function validateLogin() {
  loginErrors.value = { email: '', password: '', api: '' }
  let valid = true
  if (!email.value) { loginErrors.value.email = 'El email es requerido'; valid = false }
  else if (!/\S+@\S+\.\S+/.test(email.value)) { loginErrors.value.email = 'Email inválido'; valid = false }
  if (!password.value) { loginErrors.value.password = 'La contraseña es requerida'; valid = false }
  return valid
}

function validateRegister() {
  registerErrors.value = { name: '', email: '', password: '', confirm: '', api: '' }
  let valid = true
  if (!registerName.value.trim()) { registerErrors.value.name = 'El nombre es requerido'; valid = false }
  if (!registerEmail.value) { registerErrors.value.email = 'El email es requerido'; valid = false }
  else if (!/\S+@\S+\.\S+/.test(registerEmail.value)) { registerErrors.value.email = 'Email inválido'; valid = false }
  if (!registerPassword.value || registerPassword.value.length < 6) {
    registerErrors.value.password = 'Mínimo 6 caracteres'; valid = false
  }
  if (registerPassword.value !== registerConfirm.value) {
    registerErrors.value.confirm = 'Las contraseñas no coinciden'; valid = false
  }
  return valid
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function handleLogin() {
  if (!validateLogin()) return
  try {
    await auth.login(email.value, password.value)
    const redirect = route.query.redirect as string | undefined
    router.push(redirect ?? '/')
  } catch (e: unknown) {
    loginErrors.value.api = e instanceof Error ? e.message : 'Error al iniciar sesión'
  }
}

async function handleRegister() {
  if (!validateRegister()) return
  try {
    await auth.register(registerName.value, registerEmail.value, registerPassword.value)
    router.push('/')
  } catch (e: unknown) {
    registerErrors.value.api = e instanceof Error ? e.message : 'Error al registrarse'
  }
}

const isLoginLoading = computed(() => auth.loading && activeTab.value === 'login')
const isRegisterLoading = computed(() => auth.loading && activeTab.value === 'register')
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4 py-12">
    <div class="w-full max-w-md">

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-lg overflow-hidden">

        <!-- Tabs -->
        <div class="flex border-b border-gray-200">
          <button
            v-for="tab in ['login', 'register'] as const"
            :key="tab"
            class="flex-1 py-4 text-sm font-semibold transition-colors"
            :class="activeTab === tab
              ? 'text-brand border-b-2 border-brand -mb-px bg-white'
              : 'text-gray-500 hover:text-gray-700 bg-gray-50'"
            @click="activeTab = tab; auth.clearError()"
          >
            {{ tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta' }}
          </button>
        </div>

        <div class="p-8">

          <!-- ── LOGIN FORM ── -->
          <form v-if="activeTab === 'login'" class="space-y-5" @submit.prevent="handleLogin">
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold text-gray-900">¡Bienvenido!</h1>
              <p class="text-sm text-gray-500 mt-1">Ingresá a tu cuenta para continuar</p>
            </div>

            <!-- Demo hint -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <strong>Demo:</strong> demo@example.com / demo1234
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="tu@email.com"
                class="input w-full"
                :class="{ 'border-red-400 focus:ring-red-300': loginErrors.email }"
              />
              <p v-if="loginErrors.email" class="mt-1 text-xs text-red-500">{{ loginErrors.email }}</p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="input w-full pr-10"
                  :class="{ 'border-red-400 focus:ring-red-300': loginErrors.password }"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  @click="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'fa fa-eye-slash' : 'fa fa-eye'" />
                </button>
              </div>
              <p v-if="loginErrors.password" class="mt-1 text-xs text-red-500">{{ loginErrors.password }}</p>
            </div>

            <!-- API error -->
            <div v-if="loginErrors.api" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              <i class="fa fa-circle-exclamation mr-1" /> {{ loginErrors.api }}
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              :disabled="isLoginLoading"
            >
              <span v-if="isLoginLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {{ isLoginLoading ? 'Ingresando...' : 'Iniciar Sesión' }}
            </button>

            <p class="text-center text-sm text-gray-500">
              ¿No tenés cuenta?
              <button type="button" class="text-brand font-medium hover:underline" @click="activeTab = 'register'">
                Registrate
              </button>
            </p>
          </form>

          <!-- ── REGISTER FORM ── -->
          <form v-else class="space-y-4" @submit.prevent="handleRegister">
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold text-gray-900">Crear cuenta</h1>
              <p class="text-sm text-gray-500 mt-1">Completá tus datos para registrarte</p>
            </div>

            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input
                v-model="registerName"
                type="text"
                autocomplete="name"
                placeholder="Juan Pérez"
                class="input w-full"
                :class="{ 'border-red-400 focus:ring-red-300': registerErrors.name }"
              />
              <p v-if="registerErrors.name" class="mt-1 text-xs text-red-500">{{ registerErrors.name }}</p>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="registerEmail"
                type="email"
                autocomplete="email"
                placeholder="tu@email.com"
                class="input w-full"
                :class="{ 'border-red-400 focus:ring-red-300': registerErrors.email }"
              />
              <p v-if="registerErrors.email" class="mt-1 text-xs text-red-500">{{ registerErrors.email }}</p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div class="relative">
                <input
                  v-model="registerPassword"
                  :type="showRegisterPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  class="input w-full pr-10"
                  :class="{ 'border-red-400 focus:ring-red-300': registerErrors.password }"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  @click="showRegisterPassword = !showRegisterPassword"
                >
                  <i :class="showRegisterPassword ? 'fa fa-eye-slash' : 'fa fa-eye'" />
                </button>
              </div>
              <p v-if="registerErrors.password" class="mt-1 text-xs text-red-500">{{ registerErrors.password }}</p>
            </div>

            <!-- Confirm Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input
                v-model="registerConfirm"
                type="password"
                autocomplete="new-password"
                placeholder="Repetí tu contraseña"
                class="input w-full"
                :class="{ 'border-red-400 focus:ring-red-300': registerErrors.confirm }"
              />
              <p v-if="registerErrors.confirm" class="mt-1 text-xs text-red-500">{{ registerErrors.confirm }}</p>
            </div>

            <!-- API error -->
            <div v-if="registerErrors.api" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              <i class="fa fa-circle-exclamation mr-1" /> {{ registerErrors.api }}
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              :disabled="isRegisterLoading"
            >
              <span v-if="isRegisterLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {{ isRegisterLoading ? 'Creando cuenta...' : 'Crear Cuenta' }}
            </button>

            <p class="text-center text-sm text-gray-500">
              ¿Ya tenés cuenta?
              <button type="button" class="text-brand font-medium hover:underline" @click="activeTab = 'login'">
                Iniciá sesión
              </button>
            </p>
          </form>

        </div>
      </div>
    </div>
  </div>
</template>