import { NextResponse } from 'next/server'
import { getActiveSite } from '@/lib/site-context'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const categories = await prisma.customCategory.findMany({
      where: { siteId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const body = await request.json()
    const name = (body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check for duplicate within site
    const existing = await prisma.customCategory.findUnique({
      where: { siteId_slug: { siteId, slug } },
    })
    if (existing) return NextResponse.json({ error: 'Category already exists' }, { status: 409 })

    // Get max sort order
    const maxOrder = await prisma.customCategory.findFirst({
      where: { siteId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const category = await prisma.customCategory.create({
      data: {
        name,
        slug,
        icon: body.icon || 'server',
        color: body.color || '#5e6670',
        siteId,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    })

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
