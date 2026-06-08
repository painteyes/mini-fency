import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import domainsRouter from './routes/domains.js'

const app = express()
const PORT = process.env.PORT || 3000

// Comma-separated list of allowed origins
const rawOrigins = process.env.ALLOWED_ORIGINS
if (!rawOrigins) {
  console.error('Missing required environment variable: ALLOWED_ORIGINS')
  process.exit(1)
}

// Split each origin to build the whitelist
const allowedOrigins = rawOrigins.split(',').map(o => o.trim())

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

app.use(express.json())

app.use('/domains', domainsRouter)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err: Error, _req: Request, res: Response) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Blacklist service running on port ${PORT}`)
})
