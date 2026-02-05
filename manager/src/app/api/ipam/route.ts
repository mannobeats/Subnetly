import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const ipAddresses = await prisma.iPAddress.findMany({
      include: { subnet: true },
      orderBy: { address: 'asc' },
    })
    return NextResponse.json(ipAddresses)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch IP addresses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ip = await prisma.iPAddress.create({
      data: {
        address: body.address,
        mask: body.mask || 24,
        subnetId: body.subnetId,
        status: body.status || 'active',
        dnsName: body.dnsName,
        description: body.description,
        assignedTo: body.assignedTo,
      },
      include: { subnet: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'IPAddress', objectId: ip.id, action: 'create', changes: JSON.stringify(body) },
    })
    return NextResponse.json(ip)
  } catch {
    return NextResponse.json({ error: 'Failed to create IP address' }, { status: 500 })
  }
}
