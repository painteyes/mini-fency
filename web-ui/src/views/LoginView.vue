<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppNotification from '../components/AppNotification.vue'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')

const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Mini Fency</h1>
        <p class="text-sm text-gray-500 mt-1">Sign in to manage your domain blacklist</p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <AppNotification v-if="error" type="error" :message="error" />

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          >
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
