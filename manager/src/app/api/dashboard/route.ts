import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const [devices, subnets, vlans, ipAddresses, ipRanges, services, changelog] = await Promise.all([
      prisma.device.findMany({ include: { deviceType: { include: { manufacturer: true } }, services: true } }),
      prisma.subnet.findMany({ include: { vlan: true, ipAddresses: true, ipRanges: true } }),
      prisma.vLAN.findMany({ include: { subnets: true } }),
      prisma.iPAddress.findMany(),
      prisma.iPRange.findMany(),
      prisma.service.findMany({ include: { device: true } }),
      prisma.changeLog.findMany({ orderBy: { timestamp: 'desc' }, take: 10 }),
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
      },
      categoryBreakdown,
      statusBreakdown,
      subnetStats,
      recentChanges: changelog,
      services,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
