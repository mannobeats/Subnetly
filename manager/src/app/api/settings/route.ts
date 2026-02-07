import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

// GET — Get site settings
export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    let settings = await prisma.siteSettings.findUnique({ where: { siteId } })
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { siteId, healthCheckEnabled: false, healthCheckInterval: 300, healthCheckTimeout: 10 },
      })
    }
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

// PATCH — Update site settings
export async function PATCH(request: Request) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const body = await request.json()

    const settings = await prisma.siteSettings.upsert({
      where: { siteId },
      update: {
        healthCheckEnabled: body.healthCheckEnabled,
        healthCheckInterval: body.healthCheckInterval,
        healthCheckTimeout: body.healthCheckTimeout,
      },
      create: {
        siteId,
        healthCheckEnabled: body.healthCheckEnabled ?? false,
        healthCheckInterval: body.healthCheckInterval ?? 300,
        healthCheckTimeout: body.healthCheckTimeout ?? 10,
      },
    })

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
