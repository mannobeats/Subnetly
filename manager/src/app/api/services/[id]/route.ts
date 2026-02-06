import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const service = await prisma.service.update({
      where: { id },
      data: {
        name: body.name,
        deviceId: body.deviceId,
        protocol: body.protocol,
        ports: body.ports,
        description: body.description,
      },
      include: { device: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Service', objectId: id, action: 'update', changes: JSON.stringify(body) },
    })
    return NextResponse.json(service)
  } catch {
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const service = await prisma.service.findUnique({ where: { id } })
    await prisma.service.delete({ where: { id } })
    await prisma.changeLog.create({
      data: { objectType: 'Service', objectId: id, action: 'delete', changes: JSON.stringify({ name: service?.name, ports: service?.ports }) },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
