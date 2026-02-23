import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const range = await prisma.iPRange.create({
      data: {
        startAddr: body.startAddr,
        endAddr: body.endAddr,
        subnetId: body.subnetId,
        role: body.role || 'dhcp',
        description: body.description,
        status: body.status || 'active',
      },
    })
    await prisma.changeLog.create({
      data: { objectType: 'IPRange', objectId: range.id, action: 'create', changes: JSON.stringify({ startAddr: body.startAddr, endAddr: body.endAddr, role: body.role }) },
    })
    return NextResponse.json(range)
  } catch {
    return NextResponse.json({ error: 'Failed to create IP range' }, { status: 500 })
  }
}
