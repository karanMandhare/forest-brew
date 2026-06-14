import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

async function runWorkerRecordsVerification() {
  console.log('🧪 Starting worker records and attendance DB verification...')
  
  const dbPath = path.resolve(process.cwd(), 'dev.db')
  console.log(`📂 Using SQLite database at: ${dbPath}`)
  
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
  const prisma = new PrismaClient({ adapter })

  try {
    // 1. Find John
    const email = 'john@forestbrew.in'
    const worker = await prisma.user.findUnique({
      where: { email },
      include: {
        workerAttendances: true,
        workerPayments: true,
      }
    })

    if (!worker) {
      throw new Error(`Worker with email '${email}' not found. Seeding may have failed.`)
    }

    console.log(`✅ Worker found: ${worker.name} (${worker.email})`)
    console.log(`   Registered phone: ${worker.phone}`)
    console.log(`   Base monthly salary: ₹${worker.salary / 100}`)
    console.log(`   Total attendances logged: ${worker.workerAttendances.length}`)
    console.log(`   Total payments logged: ${worker.workerPayments.length}`)

    // 2. Validate seeded attendances
    if (worker.workerAttendances.length === 0) {
      throw new Error('No attendance records found for John')
    }
    console.log('📅 Checking attendance records:')
    worker.workerAttendances.forEach(att => {
      console.log(`   - [${att.status}] on ${new Date(att.date).toISOString().split('T')[0]}: "${att.notes || ''}"`)
    })

    // 3. Validate seeded payments
    if (worker.workerPayments.length === 0) {
      throw new Error('No payment records found for John')
    }
    console.log('💵 Checking payment logs:')
    worker.workerPayments.forEach(p => {
      console.log(`   - Month: ${p.month}, Status: ${p.status}, Base: ₹${p.amount/100}, Bonus: ₹${p.bonus/100}, Paid On: ${p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : 'N/A'}`)
    })

    // 4. Test temporary record creation, update, and deletion
    console.log('\n--- Testing CRUD operations on WorkerAttendance and WorkerPayment ---')
    
    // Create temp attendance
    const tempDate = new Date('2026-06-01T00:00:00.000Z')
    const tempAtt = await prisma.workerAttendance.create({
      data: {
        workerId: worker.id,
        date: tempDate,
        status: 'PRESENT',
        notes: 'Verification temporary attendance'
      }
    })
    console.log(`✅ Created temporary attendance record for ${tempDate.toISOString().split('T')[0]}`)

    // Update temp attendance
    const updatedAtt = await prisma.workerAttendance.update({
      where: { id: tempAtt.id },
      data: { status: 'HALF_DAY', notes: 'Verification updated status' }
    })
    console.log(`✅ Updated temporary attendance record to ${updatedAtt.status}`)
    if (updatedAtt.status !== 'HALF_DAY') {
      throw new Error('Attendance update did not persist correctly')
    }

    // Delete temp attendance
    await prisma.workerAttendance.delete({
      where: { id: tempAtt.id }
    })
    console.log('✅ Deleted temporary attendance record successfully')

    // Create temp payment
    const tempPayMonth = 'Jun 2026'
    const tempPay = await prisma.workerPayment.create({
      data: {
        workerId: worker.id,
        month: tempPayMonth,
        amount: 2800000,
        bonus: 50000,
        status: 'PENDING',
        notes: 'Verification temporary payment'
      }
    })
    console.log(`✅ Created temporary payment record for ${tempPayMonth}`)

    // Update temp payment
    const updatedPay = await prisma.workerPayment.update({
      where: { id: tempPay.id },
      data: { status: 'PAID', paymentDate: new Date() }
    })
    console.log(`✅ Updated temporary payment record to ${updatedPay.status}`)
    if (updatedPay.status !== 'PAID') {
      throw new Error('Payment update did not persist correctly')
    }

    // Delete temp payment
    await prisma.workerPayment.delete({
      where: { id: tempPay.id }
    })
    console.log('✅ Deleted temporary payment record successfully')

    console.log('\n🌟 ALL WORKER LEDGER DATABASE VERIFICATIONS PASSED SUCCESSFULLY! 🌟')

  } catch (err: any) {
    console.error('❌ Verification failed with error:', err.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runWorkerRecordsVerification()
