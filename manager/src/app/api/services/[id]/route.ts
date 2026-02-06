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
    return NextResponse.json(service)
  } catch {
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.service.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
