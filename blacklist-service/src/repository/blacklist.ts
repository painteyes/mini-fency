import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../../data/blacklist.json')

/** Returns all blacklisted domains. */
function load(): string[] {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as string[]
}

/** Saves the domain list to the JSON file. */
function save(domains: string[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(domains, null, 2), 'utf8')
}

/** Adds a domain to the blacklist. */
function add(domain: string): string | null {
  const normalized = domain.toLowerCase().trim()
  const domains = load()

  // Prevent duplicates
  if (domains.includes(normalized)) return null

  domains.push(normalized)
  save(domains)
  return normalized
}

/** Removes a domain from the blacklist. */
function remove(domain: string): string | null {
  const normalized = domain.toLowerCase().trim()
  const domains = load()

  const idx = domains.indexOf(normalized)
  if (idx === -1) return null // domain not found

  domains.splice(idx, 1)
  save(domains)
  return normalized
}

/** Checks whether a domain is blacklisted (case-insensitive). */
function isBlacklisted(domain: string): boolean {
  return load().includes(domain.toLowerCase().trim())
}

export default { load, add, remove, isBlacklisted }
