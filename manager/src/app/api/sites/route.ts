import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'
import { getActiveSite, seedDefaultCategories } from '@/lib/site-context'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ensure at least one site exists (auto-creates default if needed)
    await getActiveSite()

    const sites = await prisma.site.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { devices: true, subnets: true, vlans: true } },
      },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeSiteId: true },
    })

    return NextResponse.json({ sites, activeSiteId: user?.activeSiteId })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const name = (body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    
    // Check for duplicate slug
    const existing = await prisma.site.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug

    const site = await prisma.site.create({
      data: {
        name,
        slug: finalSlug,
        description: body.description || null,
        address: body.address || null,
        userId: session.user.id,
      },
    })

    // Seed default categories
    await seedDefaultCategories(site.id)

    return NextResponse.json(site)
  } catch {
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
  }
}
