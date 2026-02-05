import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const vlans = await prisma.vLAN.findMany({
      include: { subnets: true, site: true },
      orderBy: { vid: 'asc' },
    })
    return NextResponse.json(vlans)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch VLANs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const vlan = await prisma.vLAN.create({
      data: {
        vid: body.vid,
        name: body.name,
        siteId: body.siteId,
        status: body.status || 'active',
        role: body.role,
        description: body.description,
      },
      include: { subnets: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'VLAN', objectId: vlan.id, action: 'create', changes: JSON.stringify(body) },
    })
    return NextResponse.json(vlan)
  } catch {
    return NextResponse.json({ error: 'Failed to create VLAN' }, { status: 500 })
  }
}
