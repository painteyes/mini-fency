import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(username: string, password: string) {
    const response = await apiLogin(username, password)
    token.value = response.token
    localStorage.setItem('token', response.token)
  }

  function logout() {
    token.value = null
    localStorage.removeItem('token')
  }

  return { token, isAuthenticated, login, logout }
})
