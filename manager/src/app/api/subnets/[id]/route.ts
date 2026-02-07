import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const subnet = await prisma.subnet.update({
      where: { id },
      data: {
        prefix: body.prefix ? body.prefix.trim() : undefined,
        mask: body.mask,
        description: body.description,
        siteId: body.siteId,
        vlanId: body.vlanId,
        gateway: body.gateway ? body.gateway.trim() : body.gateway,
        status: body.status,
        role: body.role,
        isPool: body.isPool,
      },
      include: { vlan: true, site: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Subnet', objectId: subnet.id, action: 'update', changes: JSON.stringify(body) },
    })
    return NextResponse.json(subnet)
  } catch {
    return NextResponse.json({ error: 'Failed to update subnet' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Clear device ipAddress for any IPs in this subnet before deleting
    const ipsInSubnet = await prisma.iPAddress.findMany({ where: { subnetId: id }, select: { address: true } })
    if (ipsInSubnet.length > 0) {
      await prisma.device.updateMany({
        where: { ipAddress: { in: ipsInSubnet.map(ip => ip.address) } },
        data: { ipAddress: '' },
      })
    }

    await prisma.iPAddress.deleteMany({ where: { subnetId: id } })
    await prisma.iPRange.deleteMany({ where: { subnetId: id } })
    await prisma.changeLog.create({
      data: { objectType: 'Subnet', objectId: id, action: 'delete', changes: '{}' },
    })
    await prisma.subnet.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete subnet' }, { status: 500 })
  }
}
