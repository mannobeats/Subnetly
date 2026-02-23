import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function GET() {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const templates = await prisma.subnetTemplate.findMany({
      where: { siteId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(templates)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch subnet templates' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const body = await request.json()
    const name = (body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Template name is required' }, { status: 400 })

    const slug = slugify(name)
    const existing = await prisma.subnetTemplate.findUnique({ where: { siteId_slug: { siteId, slug } } })
    if (existing) return NextResponse.json({ error: 'Template already exists' }, { status: 409 })

    const maxOrder = await prisma.subnetTemplate.findFirst({
      where: { siteId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const template = await prisma.subnetTemplate.create({
      data: {
        siteId,
        name,
        slug,
        prefix: (body.prefix || '').trim(),
        mask: Number(body.mask) || 24,
        gateway: body.gateway ? String(body.gateway).trim() : null,
        role: body.role ? String(body.role).trim() : null,
        description: body.description ? String(body.description).trim() : null,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    })

    await prisma.changeLog.create({
      data: {
        siteId,
        objectType: 'SubnetTemplate',
        objectId: template.id,
        action: 'create',
        changes: JSON.stringify({ name: template.name, prefix: template.prefix, mask: template.mask }),
      },
    })

    return NextResponse.json(template)
  } catch {
    return NextResponse.json({ error: 'Failed to create subnet template' }, { status: 500 })
  }
}
