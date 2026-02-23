import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ApiRouteError, handleApiError, requireActiveSiteContext } from '@/lib/api-guard'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { siteId } = await requireActiveSiteContext()
    const { id } = await params
    const body = await request.json()

    const existingNetwork = await prisma.wifiNetwork.findFirst({ where: { id, siteId } })
    if (!existingNetwork) {
      throw new ApiRouteError('WiFi network not found in active site', 404)
    }

    let vlanId = existingNetwork.vlanId
    if (body.vlanId) {
      const vlan = await prisma.vLAN.findFirst({ where: { id: String(body.vlanId), siteId } })
      if (!vlan) {
        throw new ApiRouteError('VLAN not found in active site', 404)
      }
      vlanId = vlan.id
    } else if (body.vlanId === null || body.vlanId === '') {
      vlanId = null
    }

    let subnetId = existingNetwork.subnetId
    if (body.subnetId) {
      const subnet = await prisma.subnet.findFirst({ where: { id: String(body.subnetId), siteId } })
      if (!subnet) {
        throw new ApiRouteError('Subnet not found in active site', 404)
      }
      subnetId = subnet.id
    } else if (body.subnetId === null || body.subnetId === '') {
      subnetId = null
    }

    const network = await prisma.wifiNetwork.update({
      where: { id },
      data: {
        ssid: body.ssid,
        security: body.security,
        passphrase: body.passphrase,
        band: body.band,
        hidden: body.hidden,
        enabled: body.enabled,
        vlanId,
        subnetId,
        guestNetwork: body.guestNetwork,
        clientIsolation: body.clientIsolation,
        bandSteering: body.bandSteering,
        pmf: body.pmf,
        txPower: body.txPower,
        minRate: body.minRate,
        description: body.description,
      },
      include: {
        vlan: { select: { id: true, vid: true, name: true } },
        subnet: { select: { id: true, prefix: true, mask: true } },
      },
    })
    await prisma.changeLog.create({
      data: { objectType: 'WifiNetwork', objectId: network.id, action: 'update', changes: JSON.stringify(body), siteId },
    })
    return NextResponse.json(network)
  } catch (error) {
    return handleApiError(error, 'Failed to update WiFi network')
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { siteId } = await requireActiveSiteContext()
    const { id } = await params

    const existingNetwork = await prisma.wifiNetwork.findFirst({ where: { id, siteId } })
    if (!existingNetwork) {
      throw new ApiRouteError('WiFi network not found in active site', 404)
    }

    await prisma.changeLog.create({
      data: { objectType: 'WifiNetwork', objectId: id, action: 'delete', changes: '{}', siteId },
    })
    await prisma.wifiNetwork.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to delete WiFi network')
  }
}
