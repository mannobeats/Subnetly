import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const vlan = await prisma.vLAN.update({
      where: { id },
      data: {
        vid: body.vid,
        name: body.name,
        status: body.status,
        role: body.role,
        description: body.description,
        siteId: body.siteId,
      },
      include: { subnets: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'VLAN', objectId: vlan.id, action: 'update', changes: JSON.stringify(body) },
    })
    return NextResponse.json(vlan)
  } catch {
    return NextResponse.json({ error: 'Failed to update VLAN' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.changeLog.create({
      data: { objectType: 'VLAN', objectId: id, action: 'delete', changes: '{}' },
    })
    await prisma.vLAN.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete VLAN' }, { status: 500 })
  }
}
