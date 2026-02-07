import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ counts: { devices: 0, subnets: 0, vlans: 0, ipAddresses: 0, services: 0, wifiNetworks: 0 }, categoryBreakdown: {}, statusBreakdown: {}, subnetStats: [], recentChanges: [], services: [], wifiNetworks: [] })

    const [devices, subnets, vlans, ipAddresses, services, changelog, wifiNetworks] = await Promise.all([
      prisma.device.findMany({ where: { siteId }, include: { deviceType: { include: { manufacturer: true } }, services: true } }),
      prisma.subnet.findMany({ where: { siteId }, include: { vlan: true, ipAddresses: true, ipRanges: true } }),
      prisma.vLAN.findMany({ where: { siteId }, include: { subnets: true } }),
      prisma.iPAddress.findMany({ where: { subnet: { siteId } } }),
      prisma.service.findMany({ where: { siteId }, include: { device: true } }),
      prisma.changeLog.findMany({ where: { siteId }, orderBy: { timestamp: 'desc' }, take: 10 }),
      prisma.wifiNetwork.findMany({ where: { siteId }, include: { vlan: true, subnet: true } }),
    ])

    const subnetStats = subnets.map((s) => {
      const totalIps = Math.pow(2, 32 - s.mask) - 2
      const usedIps = s.ipAddresses.length
      return {
        id: s.id,
        prefix: `${s.prefix}/${s.mask}`,
        description: s.description,
        gateway: s.gateway,
        vlan: s.vlan,
        totalIps,
        usedIps,
        utilization: totalIps > 0 ? Math.round((usedIps / totalIps) * 100) : 0,
        ranges: s.ipRanges,
      }
    })

    const categoryBreakdown = devices.reduce((acc: Record<string, number>, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1
      return acc
    }, {})

    const statusBreakdown = devices.reduce((acc: Record<string, number>, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      counts: {
        devices: devices.length,
        subnets: subnets.length,
        vlans: vlans.length,
        ipAddresses: ipAddresses.length,
        services: services.length,
        wifiNetworks: wifiNetworks.length,
      },
      categoryBreakdown,
      statusBreakdown,
      subnetStats,
      recentChanges: changelog,
      services,
      wifiNetworks: wifiNetworks.map(w => ({
        id: w.id, ssid: w.ssid, security: w.security, band: w.band,
        enabled: w.enabled, guestNetwork: w.guestNetwork,
        vlan: w.vlan ? { vid: w.vlan.vid, name: w.vlan.name } : null,
        subnet: w.subnet ? { prefix: w.subnet.prefix, mask: w.subnet.mask } : null,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
