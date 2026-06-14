import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

async function checkUsers() {
  const dbPath = path.resolve(process.cwd(), 'dev.db')
  console.log(`📂 Connecting to SQLite database at: ${dbPath}`)
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
  const prisma = new PrismaClient({ adapter })

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        salary: true
      }
    })
    console.log(`\n📋 Found ${users.length} users in database:`)
    console.log(JSON.stringify(users, null, 2))
  } catch (err: any) {
    console.error('❌ Error checking users:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
