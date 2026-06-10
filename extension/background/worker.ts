const BLACKLIST_URL = import.meta.env.VITE_BLACKLIST_URL as string

/** Reads the JWT token from local storage, or null if not logged in. */
async function getToken(): Promise<string | null> {
  const { token } = await chrome.storage.local.get<{ token?: string }>('token')
  return token ?? null
}

/** Fetches the list of blocked domains from the remote API. */
async function fetchBlacklist(token: string): Promise<string[]> {
  const res = await fetch(`${BLACKLIST_URL}/domains`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store' // bypass HTTP cache — always fetch the live list from the server
  })
  if (!res.ok) throw new Error(`Blacklist fetch failed: ${res.status}`)

  const data = await res.json()

  return Array.isArray(data.domains) ? data.domains : []
}

/** Removes all dynamic blocking rules currently in effect. */
async function clearRules(): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  if (existing.length === 0) return

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules: []
  })
}

/** Replaces all dynamic rules with redirect rules for the given domains. */
async function applyRules(domains: string[]): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existing.map(r => r.id)

  const addRules = domains.map((domain, idx) => ({
    id: idx + 1,
    priority: 1,
    action: {
      type: 'redirect' as const,
      // redirect to our internal blocked page instead of showing a network error
      redirect: { extensionPath: `/blocked/index.html?domain=${encodeURIComponent(domain)}` }
    },
    condition: {
      urlFilter: `||${domain}^`, // matches any URL on this domain (declarativeNetRequest syntax)
      resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType] // top-level navigation only
    }
  }))

  // swap old rules for new ones atomically
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules })
}

/** Syncs blocking rules with the server. */
async function refreshBlacklist(): Promise<void> {
  const token = await getToken()

  if (!token) {
    // remove any leftover rules and cached list
    await clearRules()
    await chrome.storage.local.remove('blacklist')
    return
  }

  try {
    const domains = await fetchBlacklist(token)
    await chrome.storage.local.set({ blacklist: domains })
    await applyRules(domains)
  } catch (err) {
    console.error('[Mini Fency] Failed to refresh blacklist:', (err as Error).message)
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'LOGIN') {
    // persist the token then immediately sync rules
    chrome.storage.local.set({ token: msg.token }, async () => {
      await refreshBlacklist()
      sendResponse({ ok: true })
    })

    return true
  }

  if (msg.type === 'LOGOUT') {
    // wipe credentials and rules so no domain stays blocked after sign-out
    chrome.storage.local.remove(['token', 'blacklist'], async () => {
      await clearRules()
      sendResponse({ ok: true })
    })

    return true
  }

  if (msg.type === 'GET_STATUS') {
    // build a status snapshot for the popup UI
    chrome.storage.local.get<{
      token?: string
      blacklist?: string[]
    }>(['token', 'blacklist'], data => {
      sendResponse({
        isLoggedIn: !!data.token,
        domainCount: (data.blacklist ?? []).length
      })
    })

    return true
  }

  if (msg.type === 'REFRESH') {
    refreshBlacklist().then(() => sendResponse({ ok: true }))
    return true
  }
})

// Allows the web-ui to trigger a rule refresh after domain changes
chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'REFRESH') {
    refreshBlacklist().then(() => sendResponse({ ok: true }))
    return true
  }
})

// Re-creates the alarm on each startup
chrome.alarms.create('refresh', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'refresh') refreshBlacklist()
})

// Initial sync on service worker startup
refreshBlacklist()
