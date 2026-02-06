import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { siteId } = body

    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 })

    // Verify the site belongs to the user
    const site = await prisma.site.findFirst({ where: { id: siteId, userId: session.user.id } })
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeSiteId: siteId },
    })

    return NextResponse.json({ success: true, activeSiteId: siteId })
  } catch {
    return NextResponse.json({ error: 'Failed to switch site' }, { status: 500 })
  }
}
