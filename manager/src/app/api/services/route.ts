import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json([], { status: 200 })

    const services = await prisma.service.findMany({
      where: { siteId },
      include: { device: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(services)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const body = await request.json()
    const service = await prisma.service.create({
      data: {
        name: body.name,
        deviceId: body.deviceId,
        protocol: body.protocol || 'tcp',
        ports: body.ports,
        description: body.description,
        siteId,
      },
      include: { device: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Service', objectId: service.id, action: 'create', changes: JSON.stringify({ name: body.name, ports: body.ports, protocol: body.protocol }), siteId },
    })
    return NextResponse.json(service)
  } catch {
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
