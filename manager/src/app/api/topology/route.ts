import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
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
    })
    return NextResponse.json(devices)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch topology' }, { status: 500 })
  }
}
