import { NextResponse } from 'next/server'
import { getActiveSite } from '@/lib/site-context'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const cat = await prisma.customCategory.findFirst({ where: { id, siteId } })
    if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const updated = await prisma.customCategory.update({
      where: { id },
      data: {
        name: body.name !== undefined ? (body.name || '').trim() : undefined,
        icon: body.icon !== undefined ? body.icon : undefined,
        color: body.color !== undefined ? body.color : undefined,
        sortOrder: body.sortOrder !== undefined ? body.sortOrder : undefined,
      },
    })

    // If name changed, update slug
    if (body.name !== undefined) {
      const newSlug = (body.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      await prisma.customCategory.update({ where: { id }, data: { slug: newSlug } })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { siteId } = await getActiveSite()
    if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 401 })

    const { id } = await params

    const cat = await prisma.customCategory.findFirst({ where: { id, siteId } })
    if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    await prisma.customCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
