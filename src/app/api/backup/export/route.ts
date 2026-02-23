import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

// GET — Export full site data as JSON backup
export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const site = await prisma.site.findUnique({ where: { id: siteId } })
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    const [
      categories,
      devices,
      subnets,
      vlans,
      services,
      wifiNetworks,
      ipAddresses,
      ipRanges,
      changeLogs,
      siteSettings,
    ] = await Promise.all([
      prisma.customCategory.findMany({ where: { siteId }, orderBy: { sortOrder: 'asc' } }),
      prisma.device.findMany({ where: { siteId }, orderBy: { name: 'asc' } }),
      prisma.subnet.findMany({ where: { siteId }, orderBy: { prefix: 'asc' } }),
      prisma.vLAN.findMany({ where: { siteId }, orderBy: { vid: 'asc' } }),
      prisma.service.findMany({ where: { siteId }, orderBy: { name: 'asc' } }),
      prisma.wifiNetwork.findMany({ where: { siteId }, orderBy: { ssid: 'asc' } }),
      prisma.iPAddress.findMany({ where: { subnet: { siteId } }, orderBy: { address: 'asc' } }),
      prisma.iPRange.findMany({ where: { subnet: { siteId } }, orderBy: { startAddr: 'asc' } }),
      prisma.changeLog.findMany({ where: { siteId }, orderBy: { timestamp: 'desc' } }),
      prisma.siteSettings.findUnique({ where: { siteId } }),
    ])

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      site: {
        name: site.name,
        slug: site.slug,
        description: site.description,
        address: site.address,
      },
      siteSettings: siteSettings ? {
        healthCheckEnabled: siteSettings.healthCheckEnabled,
        healthCheckInterval: siteSettings.healthCheckInterval,
        healthCheckTimeout: siteSettings.healthCheckTimeout,
      } : null,
      categories: categories.map(c => ({
        type: c.type,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color,
        sortOrder: c.sortOrder,
      })),
      vlans: vlans.map(v => ({
        vid: v.vid,
        name: v.name,
        status: v.status,
        role: v.role,
        description: v.description,
        _exportId: v.id,
      })),
      subnets: subnets.map(s => ({
        prefix: s.prefix,
        mask: s.mask,
        description: s.description,
        gateway: s.gateway,
        status: s.status,
        role: s.role,
        isPool: s.isPool,
        _exportId: s.id,
        _vlanExportId: s.vlanId,
      })),
      ipAddresses: ipAddresses.map(ip => ({
        address: ip.address,
        mask: ip.mask,
        status: ip.status,
        dnsName: ip.dnsName,
        description: ip.description,
        assignedTo: ip.assignedTo,
        _subnetExportId: ip.subnetId,
      })),
      ipRanges: ipRanges.map(r => ({
        startAddr: r.startAddr,
        endAddr: r.endAddr,
        role: r.role,
        description: r.description,
        status: r.status,
        _subnetExportId: r.subnetId,
      })),
      devices: devices.map(d => ({
        name: d.name,
        macAddress: d.macAddress,
        ipAddress: d.ipAddress,
        category: d.category,
        status: d.status,
        serial: d.serial,
        assetTag: d.assetTag,
        notes: d.notes,
        platform: d.platform,
        _exportId: d.id,
      })),
      services: services.map(s => ({
        name: s.name,
        protocol: s.protocol,
        ports: s.ports,
        description: s.description,
        url: s.url,
        environment: s.environment,
        isDocker: s.isDocker,
        dockerImage: s.dockerImage,
        dockerCompose: s.dockerCompose,
        stackName: s.stackName,
        healthStatus: s.healthStatus,
        version: s.version,
        dependencies: s.dependencies,
        tags: s.tags,
        healthCheckEnabled: s.healthCheckEnabled,
        _deviceExportId: s.deviceId,
      })),
      wifiNetworks: wifiNetworks.map(w => ({
        ssid: w.ssid,
        security: w.security,
        passphrase: w.passphrase,
        band: w.band,
        hidden: w.hidden,
        enabled: w.enabled,
        guestNetwork: w.guestNetwork,
        clientIsolation: w.clientIsolation,
        bandSteering: w.bandSteering,
        pmf: w.pmf,
        txPower: w.txPower,
        minRate: w.minRate,
        description: w.description,
        _vlanExportId: w.vlanId,
        _subnetExportId: w.subnetId,
      })),
      changeLogs: changeLogs.map(l => ({
        objectType: l.objectType,
        objectId: l.objectId,
        action: l.action,
        changes: l.changes,
        timestamp: l.timestamp.toISOString(),
      })),
    }

    const json = JSON.stringify(backup, null, 2)
    const filename = `subnetly-backup-${site.slug}-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
