import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const services = await prisma.service.findMany({
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
    const body = await request.json()
    const service = await prisma.service.create({
      data: {
        name: body.name,
        deviceId: body.deviceId,
        protocol: body.protocol || 'tcp',
        ports: body.ports,
        description: body.description,
      },
      include: { device: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Service', objectId: service.id, action: 'create', changes: JSON.stringify({ name: body.name, ports: body.ports, protocol: body.protocol }) },
    })
    return NextResponse.json(service)
  } catch {
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
