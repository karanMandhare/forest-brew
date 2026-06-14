// ============================================================
//  Forest Brew — Database Seed
//  Run: npx prisma db seed
// ============================================================
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
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
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          process.env[key] = val
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse .env.local:', err)
  }
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌿 Seeding Forest Brew database...')

  // ── Admin User ──────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin@forestbrew', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@forestbrew.in' },
    update: {},
    create: {
      email: 'admin@forestbrew.in',
      name: 'Forest Admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      loyaltyPoints: 0,
    },
  })
  console.log('✅ Admin user:', admin.email)

  // ── Configured Admin User ──────────────────────────────────────────
  const configAdminEmail = process.env.ADMIN_EMAIL || 'adminkaran@gmail.com'
  const adminKaranHash = await bcrypt.hash('admin@forestbrew', 12)
  const adminKaran = await prisma.user.upsert({
    where: { email: configAdminEmail },
    update: {},
    create: {
      email: configAdminEmail,
      name: 'Karan Admin',
      passwordHash: adminKaranHash,
      role: 'ADMIN',
      loyaltyPoints: 0,
    },
  })
  console.log('✅ Configured Admin user:', adminKaran.email)

  // ── Demo User ──────────────────────────────────────────────
  const userHash = await bcrypt.hash('user@forestbrew', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@forestbrew.in' },
    update: {},
    create: {
      email: 'demo@forestbrew.in',
      name: 'Arjun Forest',
      passwordHash: userHash,
      role: 'USER',
      loyaltyPoints: 120,
    },
  })
  console.log('✅ Demo user:', demoUser.email)

  // ── Modifiers ───────────────────────────────────────────────
  const modifiers = await Promise.all([
    // Milk types
    prisma.modifier.upsert({ where: { id: 'mod-milk-whole' }, update: {}, create: { id: 'mod-milk-whole', name: 'Whole Milk', type: 'MILK', priceAdjustment: 0 } }),
    prisma.modifier.upsert({ where: { id: 'mod-milk-oat' }, update: {}, create: { id: 'mod-milk-oat', name: 'Oat Milk', type: 'MILK', priceAdjustment: 4000 } }),
    prisma.modifier.upsert({ where: { id: 'mod-milk-almond' }, update: {}, create: { id: 'mod-milk-almond', name: 'Almond Milk', type: 'MILK', priceAdjustment: 5000 } }),
    prisma.modifier.upsert({ where: { id: 'mod-milk-soy' }, update: {}, create: { id: 'mod-milk-soy', name: 'Soy Milk', type: 'MILK', priceAdjustment: 4000 } }),
    prisma.modifier.upsert({ where: { id: 'mod-milk-coconut' }, update: {}, create: { id: 'mod-milk-coconut', name: 'Coconut Milk', type: 'MILK', priceAdjustment: 5000 } }),
    // Syrups
    prisma.modifier.upsert({ where: { id: 'mod-syrup-vanilla' }, update: {}, create: { id: 'mod-syrup-vanilla', name: 'Vanilla', type: 'SYRUP', priceAdjustment: 3000 } }),
    prisma.modifier.upsert({ where: { id: 'mod-syrup-hazelnut' }, update: {}, create: { id: 'mod-syrup-hazelnut', name: 'Hazelnut', type: 'SYRUP', priceAdjustment: 3000 } }),
    prisma.modifier.upsert({ where: { id: 'mod-syrup-caramel' }, update: {}, create: { id: 'mod-syrup-caramel', name: 'Caramel', type: 'SYRUP', priceAdjustment: 3000 } }),
    prisma.modifier.upsert({ where: { id: 'mod-syrup-classic' }, update: {}, create: { id: 'mod-syrup-classic', name: 'Classic Syrup', type: 'SYRUP', priceAdjustment: 3000 } }),
    prisma.modifier.upsert({ where: { id: 'mod-syrup-lavender' }, update: {}, create: { id: 'mod-syrup-lavender', name: 'Lavender', type: 'SYRUP', priceAdjustment: 3500 } }),
    // Temperature
    prisma.modifier.upsert({ where: { id: 'mod-temp-hot' }, update: {}, create: { id: 'mod-temp-hot', name: 'Hot', type: 'TEMPERATURE', priceAdjustment: 0 } }),
    prisma.modifier.upsert({ where: { id: 'mod-temp-iced' }, update: {}, create: { id: 'mod-temp-iced', name: 'Iced', type: 'TEMPERATURE', priceAdjustment: 0 } }),
    prisma.modifier.upsert({ where: { id: 'mod-temp-blended' }, update: {}, create: { id: 'mod-temp-blended', name: 'Blended', type: 'TEMPERATURE', priceAdjustment: 2000 } }),
    // Size
    prisma.modifier.upsert({ where: { id: 'mod-size-tall' }, update: {}, create: { id: 'mod-size-tall', name: 'Tall (12oz)', type: 'SIZE', priceAdjustment: 0 } }),
    prisma.modifier.upsert({ where: { id: 'mod-size-grande' }, update: {}, create: { id: 'mod-size-grande', name: 'Grande (16oz)', type: 'SIZE', priceAdjustment: 5000 } }),
    prisma.modifier.upsert({ where: { id: 'mod-size-venti' }, update: {}, create: { id: 'mod-size-venti', name: 'Venti (20oz)', type: 'SIZE', priceAdjustment: 10000 } }),
  ])
  console.log(`✅ Created ${modifiers.length} modifiers`)

  // ── Products ─────────────────────────────────────────────────
  const products = [
    {
      id: 'prod-forest-espresso',
      name: 'Forest Espresso',
      slug: 'forest-espresso',
      description: 'A commanding double shot from Ethiopian highlands, dark and complex.',
      notes: 'Dark cacao · Wild honey · Pine wood smoke · Cedar finish',
      basePrice: 32000, // ₹320 in paise
      imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&q=75',
      badge: '🌿 Signature',
      origin: 'Ethiopia Yirgacheffe',
      category: 'HOT' as const,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      id: 'prod-mossy-latte',
      name: 'Mossy Latte',
      slug: 'mossy-latte',
      description: 'Silky matcha-kissed espresso with oat cream and warming cinnamon.',
      notes: 'Matcha-kissed · Oat cream · Warm cinnamon · Morning mist',
      basePrice: 38000, // ₹380
      imageUrl: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=75',
      badge: '💚 Bestseller',
      origin: 'Colombia Huila',
      category: 'HOT' as const,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      id: 'prod-canopy-pourover',
      name: 'Canopy Pour-Over',
      slug: 'canopy-pour-over',
      description: 'A bright and fruity Kenyan AA, slow-brewed to perfection.',
      notes: 'Black currant · Cedar · Citrus zest · Dew-fresh brightness',
      basePrice: 44000, // ₹440
      imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=75',
      badge: '🍃 Reserve',
      origin: 'Kenya AA',
      category: 'RESERVE' as const,
      isAvailable: true,
      sortOrder: 3,
    },
    {
      id: 'prod-wildflower-coldbrew',
      name: 'Wildflower Cold Brew',
      slug: 'wildflower-cold-brew',
      description: '24-hour cold-steeped Guatemalan beans with hibiscus & petal sweetness.',
      notes: 'Hibiscus · Amber · Cool earth · Petal sweetness',
      basePrice: 36000, // ₹360
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=75',
      badge: '🌺 Seasonal',
      origin: 'Guatemala Antigua',
      category: 'COLD' as const,
      isAvailable: true,
      sortOrder: 4,
    },
    {
      id: 'prod-sunrise-cortado',
      name: 'Sunrise Cortado',
      slug: 'sunrise-cortado',
      description: 'Equal parts espresso and steamed milk, warm hazelnut and honey.',
      notes: 'Hazelnut · Wild honey · Toasted grain · Soft amber warmth',
      basePrice: 34000, // ₹340
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=75',
      badge: '☀️ Morning',
      origin: 'Brazil Cerrado',
      category: 'HOT' as const,
      isAvailable: true,
      sortOrder: 5,
    },
    {
      id: 'prod-velvet-flatwhite',
      name: 'Velvet Flat White',
      slug: 'velvet-flat-white',
      description: 'Ristretto-based with microfoam silk. The barista\'s pride.',
      notes: 'Brown sugar · Vanilla blossom · Silky microfoam cloud',
      basePrice: 37000, // ₹370
      imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=75',
      badge: '🤍 Classic',
      origin: 'Honduras SHB',
      category: 'HOT' as const,
      isAvailable: true,
      sortOrder: 6,
    },
    {
      id: 'prod-classic-forest-burger',
      name: 'Classic Forest Burger',
      slug: 'classic-forest-burger',
      description: 'A premium grilled veg patty burger with fresh lettuce, tomatoes, and house sauce.',
      notes: 'Smoky patty · Artisan bun · Heirloom tomato · House herb mayo',
      basePrice: 28000, // ₹280
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=75',
      badge: '🍔 Popular',
      origin: 'Local Bakery',
      category: 'FOOD' as const,
      isAvailable: true,
      sortOrder: 7,
    },
    {
      id: 'prod-almond-croissant',
      name: 'Almond Croissant',
      slug: 'almond-croissant',
      description: 'Flaky butter croissant filled with sweet almond frangipane and topped with sliced almonds.',
      notes: 'Buttery layers · Sweet almond paste · Toasted almond slices · Powdered sugar',
      basePrice: 24000, // ₹240
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=75',
      badge: '🥐 Fresh Baked',
      origin: 'French Bakery',
      category: 'FOOD' as const,
      isAvailable: true,
      sortOrder: 8,
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    })
  }
  console.log(`✅ Created ${products.length} products`)

  // ── Product Modifiers (Linking Products with Modifiers) ──────
  console.log('🔗 Linking products and modifiers...')
  let linkCount = 0
  for (const product of products) {
    for (const modifier of modifiers) {
      await prisma.productModifier.upsert({
        where: {
          productId_modifierId: {
            productId: product.id,
            modifierId: modifier.id,
          },
        },
        update: {},
        create: {
          productId: product.id,
          modifierId: modifier.id,
        },
      })
      linkCount++
    }
  }
  console.log(`✅ Linked ${linkCount} product-modifier relations`)

  console.log('\n🌿 Forest Brew database seeded successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Admin Login (Configured): ${configAdminEmail} / admin@forestbrew`)
  console.log('Admin Login (Default): admin@forestbrew.in / admin@forestbrew')
  console.log('Demo Login:  demo@forestbrew.in  / user@forestbrew')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
