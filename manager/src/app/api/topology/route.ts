import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ devices: [], subnets: [] })

    const [devices, subnets] = await Promise.all([
      prisma.device.findMany({
        where: { siteId },
        include: {
          interfaces: {
            include: {
              cableA: { include: { interfaceB: { include: { device: true } } } },
              cableB: { include: { interfaceA: { include: { device: true } } } },
            },
          },
          services: true,
          deviceType: { include: { manufacturer: true } },
        },
        orderBy: { ipAddress: 'asc' },
      }),
      prisma.subnet.findMany({
        where: { siteId },
        include: { vlan: true, ipAddresses: true },
      }),
    ])
    return NextResponse.json({ devices, subnets })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch topology' }, { status: 500 })
  }
}
