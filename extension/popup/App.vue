<script setup>
import { ref, onMounted } from 'vue'

const AUTH_URL = import.meta.env.VITE_AUTH_URL

const username = ref('')
const password = ref('')

const loginError = ref('')
const isLoggedIn = ref(false)
const isLoginLoading = ref(false)

const domainCount = ref(0)
const isRefreshLoading = ref(false)

/** Ask the background worker for the current auth/blacklist status. */
function loadStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, res => {
    if (!res) return
    isLoggedIn.value = res.isLoggedIn
    domainCount.value = res.domainCount
  })
}

async function handleLogin() {
  if (!username.value.trim() || !password.value) {
    loginError.value = 'Username and password are required.'
    return
  }

  isLoginLoading.value = true
  loginError.value = ''

  try {
    // POST credentials to the auth service and retrieve a JWT
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value.trim(), password: password.value })
    })

    const data = await res.json()

    if (!res.ok) {
      loginError.value = data.error || 'Login failed.'
      return
    }

    // forward the token to the background worker so it can persist and use it
    chrome.runtime.sendMessage({ type: 'LOGIN', token: data.token }, reply => {
      if (reply?.ok) loadStatus()
    })
  } catch {
    loginError.value = 'Cannot reach the auth service. Check that the backend is running.'
  } finally {
    isLoginLoading.value = false
  }
}

function handleLogout() {
  // tell the background worker to drop the token, then reset local state
  chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
    username.value = ''
    password.value = ''
    isLoggedIn.value = false
  })
}

function handleRefresh() {
  isRefreshLoading.value = true

  // trigger a blacklist re-fetch in the background worker, then pull the updated count
  chrome.runtime.sendMessage({ type: 'REFRESH' }, () => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, res => {
      if (res) domainCount.value = res.domainCount
      isRefreshLoading.value = false
    })
  })
}

onMounted(loadStatus)
</script>

<template>
  <div class="wrapper">
    <div class="header">
      <svg class="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      <h1>Mini Fency</h1>
    </div>

    <!-- Login view -->
    <div v-if="!isLoggedIn" class="content">
      <div v-if="loginError" class="msg msg-error">{{ loginError }}</div>
      <div class="field">
        <label for="username">Username</label>
        <input
          id="username"
          v-model="username"
          type="text"
          placeholder="admin"
          autocomplete="username"
          @keydown.enter="handleLogin"
        />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          @keydown.enter="handleLogin"
        />
      </div>
      <button class="btn btn-primary" :disabled="isLoginLoading" @click="handleLogin">
        {{ isLoginLoading ? 'Signing in…' : 'Sign in' }}
      </button>
    </div>

    <!-- Status view -->
    <div v-else class="content">
      <div class="status-card">
        <div class="status-row">
          <span class="status-label">Protection active</span>
          <span class="badge-on">ON</span>
        </div>
        <div class="status-count">{{ domainCount }}</div>
        <div class="status-sub">domains blocked</div>
      </div>
      <button class="refresh-btn" :disabled="isRefreshLoading" @click="handleRefresh">
        {{ isRefreshLoading ? '↻ Refreshing…' : '↻ Refresh blacklist' }}
      </button>
      <div class="divider"></div>
      <button class="btn btn-logout" @click="handleLogout">Logout</button>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  width: 300px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  color: #1a1a1a;
  background: #fff;
}
</style>

<style scoped>
.wrapper {
  width: 300px;
}
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #1d4ed8;
  color: #fff;
}
.header-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.header h1 {
  font-size: 15px;
  font-weight: 600;
}
.content {
  padding: 16px;
}
.field {
  margin-bottom: 12px;
}
label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}
input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}
input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary {
  background: #2563eb;
  color: #fff;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn-logout {
  background: #f3f4f6;
  color: #374151;
  margin-top: 8px;
}
.btn-logout:hover {
  background: #e5e7eb;
}
.msg {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 10px;
}
.msg-error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.msg-success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}
.status-card {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}
.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.status-label {
  font-size: 12px;
  color: #166534;
  font-weight: 500;
}
.status-count {
  font-size: 20px;
  font-weight: 700;
  color: #15803d;
  margin: 4px 0 0;
}
.status-sub {
  font-size: 11px;
  color: #166534;
  margin-top: 2px;
}
.badge-on {
  background: #dcfce7;
  color: #166534;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 12px 0;
}
.refresh-btn {
  width: 100%;
  padding: 6px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
}
.refresh-btn:hover {
  background: #f9fafb;
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
