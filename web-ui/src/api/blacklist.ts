const BASE = import.meta.env.VITE_BLACKLIST_BASE_URL || '/api/blacklist'

/** Parses the error body and throws with a readable message. */
async function handleError(res: Response) {
  const err = await res.json().catch(() => ({ error: 'Request failed' }))
  throw new Error(err.error || 'Request failed')
}

/**
 * Creates an authenticated API client for the blacklist service.
 * TODO: replace with an axios instance + request interceptor.
 */
export function blacklistApi(token: string | null) {
  if (!token) throw new Error('No auth token provided')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }

  return {
    /** Fetches the full list of blacklisted domains. */
    async getDomains(): Promise<string[]> {
      const res = await fetch(`${BASE}/domains`, { headers })
      if (!res.ok) await handleError(res)

      const data = await res.json()
      return data.domains as string[]
    },

    /** Adds a new domain to the blacklist. */
    async addDomain(domain: string): Promise<void> {
      const res = await fetch(`${BASE}/domains`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ domain })
      })
      if (!res.ok) await handleError(res)
    },

    /** Removes a domain from the blacklist by name. */
    async removeDomain(domain: string): Promise<void> {
      const res = await fetch(`${BASE}/domains/${encodeURIComponent(domain)}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) await handleError(res)
    }
  }
}
