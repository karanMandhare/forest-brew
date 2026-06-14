// ============================================================
//  prisma.config.ts — Prisma 7 configuration
//  Loads connection URL from .env.local
// ============================================================

import { defineConfig } from 'prisma/config'
import fs from 'node:fs'
import path from 'node:path'

// Manually load env variables from .env.local if not already set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//') && trimmed.includes('=')) {
          const firstEqual = trimmed.indexOf('=')
          const key = trimmed.slice(0, firstEqual).trim()
          let val = trimmed.slice(firstEqual + 1).trim()
          // Strip surrounding quotes
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          process.env[key] = val
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse .env.local file:', err)
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
