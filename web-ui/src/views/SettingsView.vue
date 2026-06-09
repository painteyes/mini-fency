<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppNotification from '../components/AppNotification.vue'

const router = useRouter()
const auth = useAuthStore()

// Build-time value (Docker build arg or VITE_EXTENSION_ID in web-ui/.env)
const envId = import.meta.env.VITE_EXTENSION_ID as string | undefined

// Runtime value stored manually by the user
const storedId = localStorage.getItem('extensionId') ?? ''

const extensionId = ref(envId || storedId)

// True when the ID comes from the environment
const fromEnv = computed(() => !!envId)

const showSavedToast = ref(false)

function save() {
  const val = extensionId.value.trim()
  if (val) {
    localStorage.setItem('extensionId', val)
  } else {
    localStorage.removeItem('extensionId')
  }

  extensionId.value = val
  showSavedToast.value = true

  setTimeout(() => (showSavedToast.value = false), 3000)
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navbar -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <span class="font-semibold text-gray-900">Mini Fency</span>
        </div>
        <div class="flex items-center gap-4">
          <RouterLink to="/" class="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Dashboard
          </RouterLink>
          <button
            @click="handleLogout"
            class="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-3xl mx-auto px-4 py-8">
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-gray-900">Settings</h2>
        <p class="text-sm text-gray-500">Configure the browser extension integration.</p>
      </div>

      <AppNotification v-if="showSavedToast" type="success" message="Settings saved." />

      <div class="bg-white rounded-xl border border-gray-200 p-6 mt-4">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium text-gray-900">Extension ID</span>
          <span v-if="extensionId" class="text-xs font-medium text-green-600"> Connected </span>
          <span v-else class="text-xs font-medium text-gray-400"> Not configured </span>
        </div>

        <p class="text-xs text-gray-400 mb-4">
          Paste your Chrome extension ID to enable instant blacklist sync when domains are added or
          removed. Find it at
          <span class="font-mono">chrome://extensions</span> after loading the extension manually.
        </p>

        <div class="flex gap-3">
          <input
            v-model="extensionId"
            :readonly="fromEnv"
            type="text"
            placeholder="e.g. abcdefghijklmnopqrstuvwxyzabcdef"
            :class="[
              'flex-1 px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none',
              fromEnv
                ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-default'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            ]"
          />
          <button
            v-if="!fromEnv"
            @click="save"
            class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Save
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
