import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const subnets = await prisma.subnet.findMany({
      include: { vlan: true, site: true, ipAddresses: true, ipRanges: true },
      orderBy: { prefix: 'asc' },
    })
    return NextResponse.json(subnets)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch subnets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const subnet = await prisma.subnet.create({
      data: {
        prefix: (body.prefix || '').trim(),
        mask: body.mask,
        description: body.description,
        siteId: body.siteId,
        vlanId: body.vlanId,
        gateway: body.gateway ? body.gateway.trim() : null,
        status: body.status || 'active',
        role: body.role,
        isPool: body.isPool || false,
      },
      include: { vlan: true, site: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Subnet', objectId: subnet.id, action: 'create', changes: JSON.stringify(body) },
    })
    return NextResponse.json(subnet)
  } catch {
    return NextResponse.json({ error: 'Failed to create subnet' }, { status: 500 })
  }
}
