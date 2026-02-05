import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { ipAddress: 'asc' },
    })
    return NextResponse.json(devices)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const device = await prisma.device.create({
      data: {
        name: body.name,
        macAddress: body.macAddress,
        ipAddress: body.ipAddress,
        category: body.category,
        notes: body.notes,
      },
    })
    return NextResponse.json(device)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create device' }, { status: 500 })
  }
}
