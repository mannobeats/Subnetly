import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { ipAddress: 'asc' },
    })
    return NextResponse.json(devices)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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
      },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Device', objectId: device.id, action: 'create', changes: JSON.stringify({ name: body.name, ipAddress: body.ipAddress, category: body.category, status: body.status }) },
    })
    return NextResponse.json(device)
  } catch {
    return NextResponse.json({ error: 'Failed to create device' }, { status: 500 })
  }
}
