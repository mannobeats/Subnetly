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
      // Count both IPAM entries AND devices whose IP falls in this subnet
      const ipamIps = new Set(s.ipAddresses.map(ip => ip.address))
      const prefix = s.prefix
      const mask = s.mask
      const toNum = (addr: string) => addr.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0
      const prefixNum = toNum(prefix)
      const maskBits = (0xFFFFFFFF << (32 - mask)) >>> 0
      devices.forEach(d => {
        try {
          const devIp = toNum(d.ipAddress)
          if ((devIp & maskBits) === (prefixNum & maskBits)) ipamIps.add(d.ipAddress)
        } catch { /* skip invalid */ }
      })
      const usedIps = ipamIps.size
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

    // Health breakdown for services
    const healthBreakdown = services.reduce((acc: Record<string, number>, s) => {
      const status = (s as Record<string, unknown>).healthStatus as string || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    const monitoredCount = services.filter(s => (s as Record<string, unknown>).healthCheckEnabled).length

    return NextResponse.json({
      counts: {
        devices: devices.length,
        subnets: subnets.length,
        vlans: vlans.length,
        ipAddresses: ipAddresses.length,
        services: services.length,
        wifiNetworks: wifiNetworks.length,
        monitored: monitoredCount,
      },
      categoryBreakdown,
      statusBreakdown,
      healthBreakdown,
      subnetStats,
      recentChanges: changelog,
      services: services.map(s => {
        const svc = s as Record<string, unknown>
        return {
          id: s.id, name: s.name, protocol: s.protocol, ports: s.ports,
          device: s.device,
          healthStatus: svc.healthStatus || 'unknown',
          uptimePercent: svc.uptimePercent ?? null,
          lastResponseTime: svc.lastResponseTime ?? null,
          healthCheckEnabled: svc.healthCheckEnabled || false,
          url: svc.url || null,
          environment: svc.environment || 'production',
          isDocker: svc.isDocker || false,
        }
      }),
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
