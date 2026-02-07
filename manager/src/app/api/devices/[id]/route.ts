import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
}

function ipBelongsToSubnet(ip: string, prefix: string, mask: number): boolean {
  const ipInt = ipToInt(ip)
  const prefixInt = ipToInt(prefix)
  const maskBits = (0xFFFFFFFF << (32 - mask)) >>> 0
  return (ipInt & maskBits) === (prefixInt & maskBits)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const cleanBody = { ...body }
    if (cleanBody.ipAddress) cleanBody.ipAddress = cleanBody.ipAddress.trim()
    if (cleanBody.name) cleanBody.name = cleanBody.name.trim()
    if (cleanBody.macAddress) cleanBody.macAddress = cleanBody.macAddress.trim()

    const oldDevice = await prisma.device.findUnique({ where: { id } })
    const device = await prisma.device.update({
      where: { id },
      data: cleanBody,
    })

    // Auto-link: if IP changed, update IPAM records
    if (cleanBody.ipAddress && oldDevice && cleanBody.ipAddress !== oldDevice.ipAddress) {
      const siteId = device.siteId
      if (siteId) {
        const subnets = await prisma.subnet.findMany({ where: { siteId } })
        for (const subnet of subnets) {
          if (ipBelongsToSubnet(cleanBody.ipAddress, subnet.prefix, subnet.mask)) {
            const existing = await prisma.iPAddress.findFirst({ where: { address: cleanBody.ipAddress, subnetId: subnet.id } })
            if (!existing) {
              await prisma.iPAddress.create({
                data: {
                  address: cleanBody.ipAddress,
                  mask: subnet.mask,
                  subnetId: subnet.id,
                  status: 'active',
                  dnsName: device.name,
                  assignedTo: device.name,
                  description: `Auto-linked to ${device.name}`,
                },
              })
            }
            break
          }
        }
      }
    }

    await prisma.changeLog.create({
      data: { objectType: 'Device', objectId: id, action: 'update', changes: JSON.stringify(body) },
    })
    return NextResponse.json(device)
  } catch (error) {
    console.error('PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const device = await prisma.device.findUnique({ where: { id } })
    await prisma.device.delete({
      where: { id },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Device', objectId: id, action: 'delete', changes: JSON.stringify({ name: device?.name, ipAddress: device?.ipAddress }) },
    })
    return NextResponse.json({ message: 'Device deleted' })
  } catch (error) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 })
  }
}
