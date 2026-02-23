import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Cleaning database — blank canvas...')
  await prisma.changeLog.deleteMany({})
  await prisma.service.deleteMany({})
  await prisma.cable.deleteMany({})
  await prisma.interface.deleteMany({})
  await prisma.iPAddress.deleteMany({})
  await prisma.iPRange.deleteMany({})
  await prisma.subnet.deleteMany({})
  await prisma.vLAN.deleteMany({})
  await prisma.device.deleteMany({})
  await prisma.deviceType.deleteMany({})
  await prisma.manufacturer.deleteMany({})
  await prisma.rack.deleteMany({})
  await prisma.site.deleteMany({})

  console.log('Database cleared. Ready for fresh use.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
