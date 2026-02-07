import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const ip = await prisma.iPAddress.update({
      where: { id },
      data: {
        address: body.address,
        mask: body.mask,
        subnetId: body.subnetId,
        status: body.status,
        dnsName: body.dnsName,
        description: body.description,
        assignedTo: body.assignedTo,
      },
      include: { subnet: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'IPAddress', objectId: id, action: 'update', changes: JSON.stringify(body) },
    })
    return NextResponse.json(ip)
  } catch {
    return NextResponse.json({ error: 'Failed to update IP address' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ip = await prisma.iPAddress.findUnique({ where: { id } })
    if (!ip) return NextResponse.json({ error: 'IP not found' }, { status: 404 })

    // Clear ipAddress on any device that was linked to this IP
    await prisma.device.updateMany({
      where: { ipAddress: ip.address },
      data: { ipAddress: '' },
    })

    await prisma.iPAddress.delete({ where: { id } })
    await prisma.changeLog.create({
      data: { objectType: 'IPAddress', objectId: id, action: 'delete', changes: JSON.stringify({ address: ip.address, dnsName: ip.dnsName }) },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete IP address' }, { status: 500 })
  }
}
