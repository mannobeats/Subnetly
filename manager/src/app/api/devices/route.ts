import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json([], { status: 200 })

    const devices = await prisma.device.findMany({
      where: { siteId },
      orderBy: { ipAddress: 'asc' },
    })
    return NextResponse.json(devices)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const body = await request.json()
    const device = await prisma.device.create({
      data: {
        name: (body.name || '').trim(),
        macAddress: (body.macAddress || '').trim(),
        ipAddress: (body.ipAddress || '').trim(),
        category: body.category,
        status: body.status || 'active',
        platform: body.platform || null,
        notes: body.notes || null,
        siteId,
      },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Device', objectId: device.id, action: 'create', changes: JSON.stringify({ name: body.name, ipAddress: body.ipAddress, category: body.category, status: body.status }), siteId },
    })
    return NextResponse.json(device)
  } catch {
    return NextResponse.json({ error: 'Failed to create device' }, { status: 500 })
  }
}
