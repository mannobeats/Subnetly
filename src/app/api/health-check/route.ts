import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

async function pingUrl(url: string, timeoutMs: number): Promise<{ status: number; responseTime: number }> {
  const start = Date.now()

  // Accept self-signed certs (extremely common in homelabs — Proxmox, TrueNAS, etc.)
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const headers = { 'User-Agent': 'HomelabManager/1.0 HealthCheck' }
    let res: Response
    try {
      // Try HEAD first (lighter)
      res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow', headers })
    } catch {
      // Fallback to GET if HEAD is rejected
      res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow', headers })
    }
    clearTimeout(timer)
    return { status: res.status, responseTime: Date.now() - start }
  } finally {
    // Restore original TLS setting
    if (prevTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls
  }
}

function determineStatus(httpStatus: number, responseTime: number): string {
  // Any HTTP response means the service is reachable.
  // "down" is only for connection failures (timeout, DNS, refused) — handled in the catch block.
  if ((httpStatus >= 200 && httpStatus < 400) || httpStatus === 401 || httpStatus === 403) {
    return responseTime > 5000 ? 'degraded' : 'healthy'
  }
  // 5xx or Cloudflare errors (520-530) = server is reachable but having issues
  if (httpStatus >= 500) return 'degraded'
  // 4xx other than auth = service is up but misconfigured
  return 'degraded'
}

// POST — Run health checks for all enabled services
export async function POST() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const settings = await prisma.siteSettings.findUnique({ where: { siteId } })
    if (!settings?.healthCheckEnabled) {
      return NextResponse.json({ message: 'Health checks disabled', checked: 0 })
    }

    const services = await prisma.service.findMany({
      where: { siteId, healthCheckEnabled: true, url: { not: null } },
    })

    const timeoutMs = (settings.healthCheckTimeout || 10) * 1000
    const results: { id: string; name: string; status: string; previousStatus: string; responseTime: number | null; error?: string }[] = []

    for (const svc of services) {
      if (!svc.url) continue
      let newStatus = 'down'
      let responseTime: number | null = null
      let errorMsg: string | undefined
      const previousStatus = svc.healthStatus

      try {
        const ping = await pingUrl(svc.url, timeoutMs)
        responseTime = ping.responseTime
        newStatus = determineStatus(ping.status, ping.responseTime)
      } catch (err) {
        responseTime = null
        newStatus = 'down'
        errorMsg = err instanceof Error ? err.message : 'Connection failed'
      }

      const newCheckCount = svc.checkCount + 1
      const newSuccessCount = svc.successCount + (newStatus !== 'down' ? 1 : 0)
      const newUptime = newCheckCount > 0 ? Math.round((newSuccessCount / newCheckCount) * 10000) / 100 : 0

      await prisma.service.update({
        where: { id: svc.id },
        data: {
          healthStatus: newStatus,
          lastCheckedAt: new Date(),
          lastResponseTime: responseTime,
          checkCount: newCheckCount,
          successCount: newSuccessCount,
          uptimePercent: newUptime,
        },
      })

      // Log health status changes to changelog
      if (previousStatus !== newStatus) {
        await prisma.changeLog.create({
          data: {
            objectType: 'Service',
            objectId: svc.id,
            action: 'update',
            changes: JSON.stringify({
              healthCheck: true,
              name: svc.name,
              from: previousStatus,
              to: newStatus,
              responseTime,
              ...(errorMsg ? { error: errorMsg } : {}),
            }),
            siteId,
          },
        })
      }

      results.push({ id: svc.id, name: svc.name, status: newStatus, previousStatus, responseTime, error: errorMsg })
    }

    return NextResponse.json({ checked: results.length, results })
  } catch {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}

// GET — Get health check settings and status
export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const settings = await prisma.siteSettings.findUnique({ where: { siteId } })
    const services = await prisma.service.findMany({
      where: { siteId, healthCheckEnabled: true },
      select: {
        id: true, name: true, url: true, healthStatus: true,
        lastCheckedAt: true, lastResponseTime: true, uptimePercent: true,
        checkCount: true, successCount: true, healthCheckEnabled: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      settings: settings || { healthCheckEnabled: false, healthCheckInterval: 300, healthCheckTimeout: 10 },
      services,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to get health check data' }, { status: 500 })
  }
}
