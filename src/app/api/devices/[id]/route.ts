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
    if ('ipAddress' in cleanBody && oldDevice && cleanBody.ipAddress !== oldDevice.ipAddress) {
      // Clear assignedTo on old IPAM record when IP changes or is removed
      if (oldDevice.ipAddress) {
        await prisma.iPAddress.updateMany({
          where: { address: oldDevice.ipAddress, assignedTo: oldDevice.name },
          data: { assignedTo: null, description: null },
        })
      }

      // Create new IPAM record for the new IP if it doesn't exist
      if (cleanBody.ipAddress) {
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
              } else {
                // Update existing IPAM record to link to this device
                await prisma.iPAddress.update({
                  where: { id: existing.id },
                  data: { assignedTo: device.name, dnsName: device.name },
                })
              }
              break
            }
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

    // Clear assignedTo on any IPAM record linked to this device's IP
    if (device?.ipAddress) {
      await prisma.iPAddress.updateMany({
        where: { address: device.ipAddress, assignedTo: device.name },
        data: { assignedTo: null, description: null },
      })
    }

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
