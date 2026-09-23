import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

import fs from 'fs'
import path from 'path'

function getDatabaseUrl(): string {
  const prismaDb = path.join(process.cwd(), 'prisma', 'custom.db')
  if (fs.existsSync(prismaDb)) {
    return `file:${prismaDb}`
  }
  const rootDb = path.join(process.cwd(), 'db', 'custom.db')
  if (fs.existsSync(rootDb)) {
    return `file:${rootDb}`
  }
  return process.env.DATABASE_URL || 'file:./prisma/custom.db'
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db