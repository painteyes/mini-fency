import express, { Request, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
import blacklist from '../repository/blacklist.js'

const router = express.Router()

router.use(authenticate) // all domain endpoints require a valid JWT

// RFC-1123 hostname validation
const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

function isValidDomain(domain: unknown): domain is string {
  if (!domain || typeof domain !== 'string') return false
  const d = domain.toLowerCase().trim()
  return d.length <= 253 && DOMAIN_RE.test(d)
}

/**
 * GET /domains
 * List all
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({ domains: blacklist.load() })
})

/**
 * POST /domains
 * Add a domain
 */
router.post('/', (req: Request, res: Response) => {
  const { domain } = req.body
  if (!isValidDomain(domain)) {
    res.status(400).json({ error: 'Invalid domain format' })
    return
  }

  const added = blacklist.add(domain)
  if (!added) {
    res.status(409).json({ error: 'Domain already in blacklist' })
    return
  }

  res.status(201).json({ message: 'Domain added', domain: added })
})

/**
 * DELETE /domains/:domain
 * Remove a domain
 */
router.delete('/:domain', (req: Request, res: Response) => {
  const { domain } = req.params
  if (!isValidDomain(domain)) {
    res.status(400).json({ error: 'Invalid domain format' })
    return
  }

  const removed = blacklist.remove(domain)
  if (!removed) {
    res.status(404).json({ error: 'Domain not in blacklist' })
    return
  }

  res.json({ message: 'Domain removed', domain: removed })
})

/**
 * GET /domains/check/:domain
 * Check if a domain is blacklisted
 */
router.get('/check/:domain', (req: Request, res: Response) => {
  const { domain } = req.params
  res.json({ domain, blacklisted: blacklist.isBlacklisted(domain) })
})

export default router
