import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ApiRouteError, handleApiError, requireActiveSiteContext } from '@/lib/api-guard'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { siteId } = await requireActiveSiteContext()
    const { id } = await params
    const body = await request.json()

    const existingRange = await prisma.iPRange.findFirst({ where: { id, subnet: { siteId } } })
    if (!existingRange) {
      throw new ApiRouteError('IP range not found in active site', 404)
    }

    const range = await prisma.iPRange.update({
      where: { id },
      data: {
        startAddr: body.startAddr ? body.startAddr.trim() : undefined,
        endAddr: body.endAddr ? body.endAddr.trim() : undefined,
        role: body.role,
        description: body.description,
        status: body.status,
      },
    })
    await prisma.changeLog.create({
      data: { objectType: 'IPRange', objectId: range.id, action: 'update', changes: JSON.stringify(body), siteId },
    })
    return NextResponse.json(range)
  } catch (error) {
    return handleApiError(error, 'Failed to update IP range')
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { siteId } = await requireActiveSiteContext()
    const { id } = await params

    const existingRange = await prisma.iPRange.findFirst({ where: { id, subnet: { siteId } } })
    if (!existingRange) {
      throw new ApiRouteError('IP range not found in active site', 404)
    }

    await prisma.changeLog.create({
      data: { objectType: 'IPRange', objectId: id, action: 'delete', changes: '{}', siteId },
    })
    await prisma.iPRange.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to delete IP range')
  }
}
