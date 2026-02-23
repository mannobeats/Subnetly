import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getActiveSite } from '@/lib/site-context'

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.subnetTemplate.findFirst({ where: { id, siteId } })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    let slug: string | undefined
    if (body.name !== undefined) {
      slug = slugify(body.name || '')
      const duplicate = await prisma.subnetTemplate.findFirst({ where: { siteId, slug, NOT: { id } } })
      if (duplicate) return NextResponse.json({ error: 'Template name already in use' }, { status: 409 })
    }

    const updated = await prisma.subnetTemplate.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        slug,
        prefix: body.prefix !== undefined ? String(body.prefix).trim() : undefined,
        mask: body.mask !== undefined ? Number(body.mask) : undefined,
        gateway: body.gateway !== undefined ? (body.gateway ? String(body.gateway).trim() : null) : undefined,
        role: body.role !== undefined ? (body.role ? String(body.role).trim() : null) : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      },
    })

    await prisma.changeLog.create({
      data: {
        siteId,
        objectType: 'SubnetTemplate',
        objectId: id,
        action: 'update',
        changes: JSON.stringify(body),
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update subnet template' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const { id } = await params
    const existing = await prisma.subnetTemplate.findFirst({ where: { id, siteId } })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    await prisma.subnetTemplate.delete({ where: { id } })
    await prisma.changeLog.create({
      data: {
        siteId,
        objectType: 'SubnetTemplate',
        objectId: id,
        action: 'delete',
        changes: JSON.stringify({ name: existing.name }),
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete subnet template' }, { status: 500 })
  }
}
