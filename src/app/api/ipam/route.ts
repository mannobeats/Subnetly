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
    const address = (body.address || '').trim()

    // Prevent duplicate IP in the same subnet
    if (body.subnetId && address) {
      const existing = await prisma.iPAddress.findFirst({
        where: { address, subnetId: body.subnetId },
      })
      if (existing) {
        return NextResponse.json({ error: `IP address ${address} already exists in this subnet` }, { status: 409 })
      }
    }

    const ip = await prisma.iPAddress.create({
      data: {
        address,
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
