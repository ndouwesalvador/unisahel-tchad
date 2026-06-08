import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

let dbUrl = process.env.DATABASE_URL

if (process.env.NODE_ENV === 'production') {
  const tmpDbPath = '/tmp/custom.db'
  const bundledDbPath = path.join(process.cwd(), 'db', 'custom.db')
  
  try {
    if (!fs.existsSync(tmpDbPath)) {
      if (fs.existsSync(bundledDbPath)) {
        fs.copyFileSync(bundledDbPath, tmpDbPath)
        console.log('Database copied to /tmp')
      } else {
        console.error('Bundled database not found at', bundledDbPath)
      }
    }
    dbUrl = `file:${tmpDbPath}`
  } catch (e) {
    console.error('Error copying database to /tmp', e)
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
