import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ApiRouteError, handleApiError, requireActiveSiteContext } from '@/lib/api-guard'

export async function GET() {
  try {
    const { siteId } = await requireActiveSiteContext()

    const ipAddresses = await prisma.iPAddress.findMany({
      where: { subnet: { siteId } },
      include: { subnet: true },
      orderBy: { address: 'asc' },
    })
    return NextResponse.json(ipAddresses)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch IP addresses')
  }
}

export async function POST(request: Request) {
  try {
    const { siteId } = await requireActiveSiteContext()
    const body = await request.json()
    const address = (body.address || '').trim()
    const subnetId = body.subnetId ? String(body.subnetId) : null

    if (!subnetId) {
      throw new ApiRouteError('subnetId is required', 400)
    }

    const subnet = await prisma.subnet.findFirst({ where: { id: subnetId, siteId } })
    if (!subnet) {
      throw new ApiRouteError('Subnet not found in active site', 404)
    }

    // Prevent duplicate IP in the same subnet
    if (address) {
      const existing = await prisma.iPAddress.findFirst({
        where: { address, subnetId },
      })
      if (existing) {
        return NextResponse.json({ error: `IP address ${address} already exists in this subnet` }, { status: 409 })
      }
    }

    const ip = await prisma.iPAddress.create({
      data: {
        address,
        mask: body.mask || 24,
        subnetId,
        status: body.status || 'active',
        dnsName: body.dnsName,
        description: body.description,
        assignedTo: body.assignedTo,
      },
      include: { subnet: true },
    })
    await prisma.changeLog.create({
      data: { objectType: 'IPAddress', objectId: ip.id, action: 'create', changes: JSON.stringify(body), siteId },
    })
    return NextResponse.json(ip)
  } catch (error) {
    return handleApiError(error, 'Failed to create IP address')
  }
}
