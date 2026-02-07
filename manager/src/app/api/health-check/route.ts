import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

// POST — Run health checks for all enabled services
export async function POST() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    // Get site settings
    const settings = await prisma.siteSettings.findUnique({ where: { siteId } })
    if (!settings?.healthCheckEnabled) {
      return NextResponse.json({ message: 'Health checks disabled', checked: 0 })
    }

    // Get all services with health check enabled AND a URL
    const services = await prisma.service.findMany({
      where: { siteId, healthCheckEnabled: true, url: { not: null } },
    })

    const timeout = (settings.healthCheckTimeout || 10) * 1000
    const results: { id: string; name: string; status: string; responseTime: number | null; error?: string }[] = []

    for (const svc of services) {
      if (!svc.url) continue
      const start = Date.now()
      let newStatus = 'down'
      let responseTime: number | null = null
      let errorMsg: string | undefined

      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeout)
        const res = await fetch(svc.url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          // @ts-expect-error Node fetch option
          rejectUnauthorized: false,
        }).catch(() =>
          // Fallback to GET if HEAD fails
          fetch(svc.url!, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'follow',
            // @ts-expect-error Node fetch option
            rejectUnauthorized: false,
          })
        )
        clearTimeout(timer)
        responseTime = Date.now() - start

        if (res.ok || res.status === 401 || res.status === 403 || res.status === 302 || res.status === 301) {
          // Service is reachable (even if auth-protected)
          newStatus = responseTime > 5000 ? 'degraded' : 'healthy'
        } else if (res.status >= 500) {
          newStatus = 'down'
        } else {
          // 4xx other than auth = degraded (service is up but misconfigured)
          newStatus = 'degraded'
        }
      } catch (err) {
        responseTime = Date.now() - start
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

      results.push({ id: svc.id, name: svc.name, status: newStatus, responseTime, error: errorMsg })
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
