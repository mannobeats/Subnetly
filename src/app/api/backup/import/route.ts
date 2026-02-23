import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

// POST — Import a JSON backup into the current site
// This REPLACES all data in the current site with the backup data
export async function POST(request: Request) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const backup = await request.json()

    // Validate backup format
    if (!backup.version || !backup.site) {
      return NextResponse.json({ error: 'Invalid backup file format. Missing version or site data.' }, { status: 400 })
    }

    // ── Phase 1: Delete all existing data in the current site ──
    // Order matters due to foreign key constraints
    await prisma.changeLog.deleteMany({ where: { siteId } })
    await prisma.iPRange.updateMany({ where: { subnet: { siteId } }, data: { schemeEntryId: null } })
    await prisma.iPAddress.deleteMany({ where: { subnet: { siteId } } })
    await prisma.iPRange.deleteMany({ where: { subnet: { siteId } } })
    await prisma.iPRangeSchemeEntry.deleteMany({ where: { scheme: { siteId } } })
    await prisma.iPRangeScheme.deleteMany({ where: { siteId } })
    await prisma.subnetTemplate.deleteMany({ where: { siteId } })
    await prisma.wifiNetwork.deleteMany({ where: { siteId } })
    await prisma.service.deleteMany({ where: { siteId } })
    await prisma.device.deleteMany({ where: { siteId } })
    await prisma.subnet.deleteMany({ where: { siteId } })
    await prisma.vLAN.deleteMany({ where: { siteId } })
    await prisma.customCategory.deleteMany({ where: { siteId } })
    await prisma.siteSettings.deleteMany({ where: { siteId } })

    // ── Phase 2: Import categories ──
    if (backup.categories?.length) {
      await prisma.customCategory.createMany({
        data: backup.categories.map((c: Record<string, unknown>) => ({
          type: (c.type as string) || 'device',
          name: c.name as string,
          slug: c.slug as string,
          icon: (c.icon as string) || 'server',
          color: (c.color as string) || '#5e6670',
          sortOrder: (c.sortOrder as number) || 0,
          siteId,
        })),
        skipDuplicates: true,
      })
    }

    // ── Phase 3: Import VLANs (build ID map for subnet references) ──
    const vlanIdMap: Record<string, string> = {}
    if (backup.vlans?.length) {
      for (const v of backup.vlans as Record<string, unknown>[]) {
        const created = await prisma.vLAN.create({
          data: {
            vid: v.vid as number,
            name: v.name as string,
            status: (v.status as string) || 'active',
            role: v.role as string | null,
            description: v.description as string | null,
            siteId,
          },
        })
        if (v._exportId) vlanIdMap[v._exportId as string] = created.id
      }
    }

    // ── Phase 4: Import Subnets (build ID map for IP/range references) ──
    const subnetIdMap: Record<string, string> = {}
    if (backup.subnets?.length) {
      for (const s of backup.subnets as Record<string, unknown>[]) {
        const vlanId = s._vlanExportId ? vlanIdMap[s._vlanExportId as string] || null : null
        const created = await prisma.subnet.create({
          data: {
            prefix: s.prefix as string,
            mask: s.mask as number,
            description: s.description as string | null,
            gateway: s.gateway as string | null,
            status: (s.status as string) || 'active',
            role: s.role as string | null,
            isPool: (s.isPool as boolean) || false,
            siteId,
            vlanId,
          },
        })
        if (s._exportId) subnetIdMap[s._exportId as string] = created.id
      }
    }

    // ── Phase 5: Import Devices (build ID map for service references) ──
    const deviceIdMap: Record<string, string> = {}
    if (backup.devices?.length) {
      for (const d of backup.devices as Record<string, unknown>[]) {
        const created = await prisma.device.create({
          data: {
            name: d.name as string,
            macAddress: (d.macAddress as string) || '',
            ipAddress: (d.ipAddress as string) || '',
            category: (d.category as string) || 'Server',
            status: (d.status as string) || 'active',
            serial: d.serial as string | null,
            assetTag: d.assetTag as string | null,
            notes: d.notes as string | null,
            platform: d.platform as string | null,
            siteId,
          },
        })
        if (d._exportId) deviceIdMap[d._exportId as string] = created.id
      }
    }

    // ── Phase 6: Import IP Addresses ──
    if (backup.ipAddresses?.length) {
      for (const ip of backup.ipAddresses as Record<string, unknown>[]) {
        const subnetId = ip._subnetExportId ? subnetIdMap[ip._subnetExportId as string] || null : null
        if (!subnetId) continue
        await prisma.iPAddress.create({
          data: {
            address: ip.address as string,
            mask: (ip.mask as number) || 24,
            status: (ip.status as string) || 'active',
            dnsName: ip.dnsName as string | null,
            description: ip.description as string | null,
            assignedTo: ip.assignedTo as string | null,
            subnetId,
          },
        })
      }
    }

    // ── Phase 7: Import templates and range schemes ──
    if (backup.subnetTemplates?.length) {
      await prisma.subnetTemplate.createMany({
        data: (backup.subnetTemplates as Record<string, unknown>[]).map((t) => ({
          siteId,
          name: t.name as string,
          slug: (t.slug as string) || (t.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          prefix: t.prefix as string,
          mask: (t.mask as number) || 24,
          gateway: t.gateway as string | null,
          role: t.role as string | null,
          description: t.description as string | null,
          sortOrder: (t.sortOrder as number) || 0,
        })),
      })
    }

    const schemeEntryIdMap: Record<string, string> = {}
    if (backup.rangeSchemes?.length) {
      for (const s of backup.rangeSchemes as Record<string, unknown>[]) {
        const scheme = await prisma.iPRangeScheme.create({
          data: {
            siteId,
            name: s.name as string,
            slug: (s.slug as string) || (s.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            description: s.description as string | null,
            sortOrder: (s.sortOrder as number) || 0,
          },
        })

        const entries = Array.isArray(s.entries) ? s.entries as Record<string, unknown>[] : []
        for (const [idx, e] of entries.entries()) {
          const created = await prisma.iPRangeSchemeEntry.create({
            data: {
              schemeId: scheme.id,
              startOctet: (e.startOctet as number) || 1,
              endOctet: (e.endOctet as number) || 1,
              role: (e.role as string) || 'general',
              description: e.description as string | null,
              sortOrder: (e.sortOrder as number) ?? idx,
            },
          })
          if (e._exportId) schemeEntryIdMap[e._exportId as string] = created.id
        }
      }
    }

    // ── Phase 8: Import IP Ranges ──
    if (backup.ipRanges?.length) {
      for (const r of backup.ipRanges as Record<string, unknown>[]) {
        const subnetId = r._subnetExportId ? subnetIdMap[r._subnetExportId as string] || null : null
        if (!subnetId) continue
        await prisma.iPRange.create({
          data: {
            startAddr: r.startAddr as string,
            endAddr: r.endAddr as string,
            role: (r.role as string) || 'general',
            description: r.description as string | null,
            status: (r.status as string) || 'active',
            schemeEntryId: r._schemeEntryExportId ? schemeEntryIdMap[r._schemeEntryExportId as string] || null : null,
            subnetId,
          },
        })
      }
    }

    // ── Phase 9: Import Services ──
    if (backup.services?.length) {
      for (const s of backup.services as Record<string, unknown>[]) {
        const deviceId = s._deviceExportId ? deviceIdMap[s._deviceExportId as string] || null : null
        if (!deviceId) continue
        await prisma.service.create({
          data: {
            name: s.name as string,
            protocol: (s.protocol as string) || 'tcp',
            ports: (s.ports as string) || '',
            description: s.description as string | null,
            url: s.url as string | null,
            environment: (s.environment as string) || 'production',
            isDocker: (s.isDocker as boolean) || false,
            dockerImage: s.dockerImage as string | null,
            dockerCompose: (s.dockerCompose as boolean) || false,
            stackName: s.stackName as string | null,
            healthStatus: (s.healthStatus as string) || 'unknown',
            version: s.version as string | null,
            dependencies: s.dependencies as string | null,
            tags: s.tags as string | null,
            healthCheckEnabled: (s.healthCheckEnabled as boolean) || false,
            deviceId,
            siteId,
          },
        })
      }
    }

    // ── Phase 10: Import WiFi Networks ──
    if (backup.wifiNetworks?.length) {
      for (const w of backup.wifiNetworks as Record<string, unknown>[]) {
        const vlanId = w._vlanExportId ? vlanIdMap[w._vlanExportId as string] || null : null
        const subnetId = w._subnetExportId ? subnetIdMap[w._subnetExportId as string] || null : null
        await prisma.wifiNetwork.create({
          data: {
            ssid: w.ssid as string,
            security: (w.security as string) || 'wpa2-personal',
            passphrase: w.passphrase as string | null,
            band: (w.band as string) || 'both',
            hidden: (w.hidden as boolean) || false,
            enabled: w.enabled !== false,
            guestNetwork: (w.guestNetwork as boolean) || false,
            clientIsolation: (w.clientIsolation as boolean) || false,
            bandSteering: w.bandSteering !== false,
            pmf: (w.pmf as string) || 'optional',
            txPower: (w.txPower as string) || 'auto',
            minRate: w.minRate as number | null,
            description: w.description as string | null,
            vlanId,
            subnetId,
            siteId,
          },
        })
      }
    }

    // ── Phase 11: Import Site Settings ──
    if (backup.siteSettings) {
      const ss = backup.siteSettings as Record<string, unknown>
      await prisma.siteSettings.create({
        data: {
          siteId,
          healthCheckEnabled: (ss.healthCheckEnabled as boolean) || false,
          healthCheckInterval: (ss.healthCheckInterval as number) || 300,
          healthCheckTimeout: (ss.healthCheckTimeout as number) || 10,
        },
      })
    }

    // ── Phase 12: Import Changelog ──
    if (backup.changeLogs?.length) {
      await prisma.changeLog.createMany({
        data: (backup.changeLogs as Record<string, unknown>[]).map(l => ({
          objectType: l.objectType as string,
          objectId: l.objectId as string,
          action: l.action as string,
          changes: l.changes as string | null,
          timestamp: new Date(l.timestamp as string),
          siteId,
        })),
      })
    }

    // Log the import itself
    await prisma.changeLog.create({
      data: {
        objectType: 'System',
        objectId: siteId,
        action: 'create',
        changes: JSON.stringify({ type: 'backup_import', from: backup.site?.name, exportedAt: backup.exportedAt }),
        siteId,
      },
    })

    const counts = {
      categories: backup.categories?.length || 0,
      vlans: backup.vlans?.length || 0,
      subnets: backup.subnets?.length || 0,
      devices: backup.devices?.length || 0,
      ipAddresses: backup.ipAddresses?.length || 0,
      ipRanges: backup.ipRanges?.length || 0,
      subnetTemplates: backup.subnetTemplates?.length || 0,
      rangeSchemes: backup.rangeSchemes?.length || 0,
      services: backup.services?.length || 0,
      wifiNetworks: backup.wifiNetworks?.length || 0,
      changeLogs: backup.changeLogs?.length || 0,
    }

    return NextResponse.json({ success: true, message: 'Backup imported successfully', counts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to import backup: ${message}` }, { status: 500 })
  }
}
