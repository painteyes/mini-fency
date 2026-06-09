const BASE = import.meta.env.VITE_AUTH_BASE_URL || '/api/auth'

export interface LoginResponse {
  token: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }))
    throw new Error(err.error || 'Login failed')
  }

  return res.json()
}
