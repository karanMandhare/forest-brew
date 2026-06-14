import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

async function seedWorkerRecords() {
  const dbPath = path.resolve(process.cwd(), 'dev.db')
  console.log(`📂 Connecting to SQLite database at: ${dbPath}`)
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
  const prisma = new PrismaClient({ adapter })

  try {
    // 1. Find John
    const email = 'john@forestbrew.in'
    const worker = await prisma.user.findUnique({
      where: { email }
    })

    if (!worker) {
      console.error(`❌ User with email '${email}' not found. Make sure to run general seeds or register worker first.`)
      return
    }

    console.log(`🌿 Found worker: ${worker.name} (${worker.email}), ID: ${worker.id}`)

    // 2. Add Attendance Records
    const attendanceData = [
      { date: new Date('2026-05-18T00:00:00.000Z'), status: 'PRESENT', notes: 'Completed 6 patient deliveries' },
      { date: new Date('2026-05-19T00:00:00.000Z'), status: 'PRESENT', notes: 'Completed 8 patient deliveries' },
      { date: new Date('2026-05-20T00:00:00.000Z'), status: 'HALF_DAY', notes: 'Left early for personal reasons' },
      { date: new Date('2026-05-21T00:00:00.000Z'), status: 'SICK_LEAVE', notes: 'Fever. Submitted doctor note.' },
      { date: new Date('2026-05-22T00:00:00.000Z'), status: 'PRESENT', notes: 'Regular Friday shift' },
    ]

    console.log('📅 Seeding attendance logs...')
    for (const att of attendanceData) {
      const rec = await prisma.workerAttendance.upsert({
        where: {
          workerId_date: {
            workerId: worker.id,
            date: att.date
          }
        },
        update: {
          status: att.status,
          notes: att.notes
        },
        create: {
          workerId: worker.id,
          date: att.date,
          status: att.status,
          notes: att.notes
        }
      })
      console.log(`   - Logged ${att.status} on ${rec.date.toISOString().split('T')[0]}`)
    }

    // 3. Add Payment Records
    const paymentData = [
      { month: 'Mar 2026', amount: 2800000, bonus: 150000, status: 'PAID', paymentDate: new Date('2026-03-31T00:00:00.000Z'), notes: 'Salary paid via bank transfer. Bonus for perfect attendance.' },
      { month: 'Apr 2026', amount: 2800000, bonus: 300000, status: 'PAID', paymentDate: new Date('2026-04-30T00:00:00.000Z'), notes: 'Salary paid via bank transfer. Performance bonus.' },
      { month: 'May 2026', amount: 2800000, bonus: 0, status: 'PENDING', paymentDate: null, notes: 'Awaiting end of month processing.' },
    ]

    console.log('💵 Seeding payments & payslips...')
    for (const p of paymentData) {
      const rec = await prisma.workerPayment.upsert({
        where: {
          workerId_month: {
            workerId: worker.id,
            month: p.month
          }
        },
        update: {
          amount: p.amount,
          bonus: p.bonus,
          status: p.status,
          paymentDate: p.paymentDate,
          notes: p.notes
        },
        create: {
          workerId: worker.id,
          month: p.month,
          amount: p.amount,
          bonus: p.bonus,
          status: p.status,
          paymentDate: p.paymentDate,
          notes: p.notes
        }
      })
      console.log(`   - Logged ${p.status} payment for ${rec.month} (Total: ₹${(p.amount + p.bonus)/100})`)
    }

    console.log('🎉 Seeding successfully completed!')

  } catch (err: any) {
    console.error('❌ Error seeding worker records:', err)
  } finally {
    await prisma.$disconnect()
  }
}

seedWorkerRecords()
