const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const products = await p.product.findMany({
    select: { id: true, name: true, isAvailable: true, category: true }
  })
  console.log(JSON.stringify(products, null, 2))
  const unavailable = products.filter(pr => !pr.isAvailable)
  console.log('\n--- UNAVAILABLE PRODUCTS COUNT:', unavailable.length)
  unavailable.forEach(u => console.log('  -', u.name, '|', u.id))
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
