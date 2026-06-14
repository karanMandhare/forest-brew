import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const products = await p.product.findMany({
  select: { id: true, name: true, isAvailable: true, category: true }
})
console.log(JSON.stringify(products, null, 2))
const unavailable = products.filter(p => !p.isAvailable)
console.log('\n--- UNAVAILABLE PRODUCTS:', unavailable.length)
await p.$disconnect()
