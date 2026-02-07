import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const network = await prisma.wifiNetwork.update({
      where: { id },
      data: {
        ssid: body.ssid,
        security: body.security,
        passphrase: body.passphrase,
        band: body.band,
        hidden: body.hidden,
        enabled: body.enabled,
        vlanId: body.vlanId,
        subnetId: body.subnetId,
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
      data: { objectType: 'WifiNetwork', objectId: network.id, action: 'update', changes: JSON.stringify(body) },
    })
    return NextResponse.json(network)
  } catch {
    return NextResponse.json({ error: 'Failed to update WiFi network' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.changeLog.create({
      data: { objectType: 'WifiNetwork', objectId: id, action: 'delete', changes: '{}' },
    })
    await prisma.wifiNetwork.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete WiFi network' }, { status: 500 })
  }
}
