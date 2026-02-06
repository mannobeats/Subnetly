import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json([], { status: 200 })

    const logs = await prisma.changeLog.findMany({
      where: { siteId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    })
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    await prisma.changeLog.deleteMany({ where: { siteId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to clear changelog' }, { status: 500 })
  }
}
