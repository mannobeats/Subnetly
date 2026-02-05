import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  const devices = [
    { name: 'Ayibolab - Tower', macAddress: '84:47:09:6A:40:EF', ipAddress: '10.0.10.10', category: 'Server' },
    { name: 'adguard', macAddress: 'BC:24:11:89:70:2C', ipAddress: '10.0.10.20', category: 'Networking' },
    { name: 'nginx-proxy-manager', macAddress: 'BC:24:11:F6:19:FA', ipAddress: '10.0.10.21', category: 'Networking' },
    { name: 'cloudflared', macAddress: 'BC:24:11:6E:2A:3F', ipAddress: '10.0.10.22', category: 'Networking' },
    { name: 'wazuh', macAddress: 'BC:24:11:9C:D7:46', ipAddress: '10.0.10.30', category: 'Networking' },
    { name: 'lab-services-01', macAddress: 'BC:24:11:4F:AF:65', ipAddress: '10.0.10.50', category: 'Server' },
    { name: 'media-server', macAddress: 'BC:24:11:19:EA:E1', ipAddress: '10.0.10.60', category: 'Server' },
    { name: 'termix', macAddress: 'BC:24:11:77:CE:CE', ipAddress: '10.0.10.70', category: 'Server' },
  ]

  console.log('Seeding devices...')
  for (const d of devices) {
    await prisma.device.create({ data: d })
  }
  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
