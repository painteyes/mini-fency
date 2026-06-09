<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { blacklistApi } from '../api/blacklist'
import { normalizeDomain } from '../utils/domain'
import AppNotification from '../components/AppNotification.vue'

type Notification = { type: 'success' | 'error'; message: string }

const router = useRouter()
const auth = useAuthStore()

const api = blacklistApi(auth.token)

const newDomain = ref('')
const loading = ref(false)

const domains = ref<string[]>([])

const notification = ref<Notification | null>(null)

/** Shows a toast notification. */
function showToast(n: Notification) {
  notification.value = n
  setTimeout(() => (notification.value = null), 4000)
}

/** Loads the blacklisted domains from the API and updates the list. */
async function fetchDomains() {
  try {
    domains.value = await api.getDomains()
  } catch (e) {
    showToast({
      type: 'error',
      message: e instanceof Error ? e.message : 'Failed to load domains'
    })
  }
}

/** Tells the Chrome extension to refresh its local blacklist cache. */
function notifyExtension() {
  // extension ID: set at build time via env var, or entered manually by the user in settings
  const id = (import.meta.env.VITE_EXTENSION_ID as string) || localStorage.getItem('extensionId')

  const runtime = chrome?.runtime
  if (!id || !runtime) {
    console.warn('[MiniFency] Cannot notify extension: missing id or chrome.runtime')
    return
  }

  runtime.sendMessage(id, { type: 'REFRESH' }, () => {
    const err = runtime.lastError
    if (err) {
      console.error('[MiniFency] sendMessage error:', err.message)
    } else {
      console.log('[MiniFency] Extension notified successfully')
    }
  })
}

/** Adds a domain to the blacklist. */
async function handleAdd() {
  const domain = normalizeDomain(newDomain.value)
  if (!domain) return

  loading.value = true
  try {
    await api.addDomain(domain)
    newDomain.value = '' // reset input field
    await fetchDomains() // refresh the list so the new domain appears
    notifyExtension() // tell the extension to re-sync its blocking rules
    showToast({ type: 'success', message: `${domain} added to blacklist` })
  } catch (e) {
    showToast({
      type: 'error',
      message: e instanceof Error ? e.message : 'Failed to add domain'
    })
  } finally {
    loading.value = false
  }
}

/** Removes a domain from the blacklist. */
async function handleRemove(domain: string) {
  try {
    await api.removeDomain(domain)
    await fetchDomains() // refresh the list so the domain disappears
    notifyExtension() // tell the extension to re-sync its blocking rules
    showToast({ type: 'success', message: `${domain} removed from blacklist` })
  } catch (e) {
    showToast({
      type: 'error',
      message: e instanceof Error ? e.message : 'Failed to remove domain'
    })
  }
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  fetchDomains()
})
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
          <RouterLink
            to="/settings"
            class="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Settings
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
        <h2 class="text-lg font-semibold text-gray-900">Domain Blacklist</h2>
        <p class="text-sm text-gray-500">
          Domains in this list will be blocked by the browser extension.
        </p>
      </div>

      <!-- Notification -->
      <div v-if="notification" class="mb-4">
        <AppNotification :type="notification.type" :message="notification.message" />
      </div>

      <!-- Add domain form -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <form @submit.prevent="handleAdd" class="flex gap-3">
          <input
            v-model="newDomain"
            type="text"
            placeholder="example.com"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            :disabled="loading || !newDomain.trim()"
            class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            Add domain
          </button>
        </form>
      </div>

      <!-- Domain list -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div v-if="domains.length === 0" class="px-4 py-10 text-center text-sm text-gray-400">
          No domains in the blacklist yet.
        </div>

        <ul v-else class="divide-y divide-gray-100">
          <li
            v-for="domain in domains"
            :key="domain"
            class="flex items-center justify-between px-4 py-3"
          >
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
              <span class="text-sm text-gray-800 font-mono">{{ domain }}</span>
            </div>
            <button
              @click="handleRemove(domain)"
              class="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Remove
            </button>
          </li>
        </ul>

        <div v-if="domains.length > 0" class="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <span class="text-xs text-gray-400"
            >{{ domains.length }} domain{{ domains.length !== 1 ? 's' : '' }} blocked</span
          >
        </div>
      </div>
    </main>
  </div>
</template>
