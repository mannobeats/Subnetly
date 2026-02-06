import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
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
      data: { objectType: 'IPRange', objectId: range.id, action: 'update', changes: JSON.stringify(body) },
    })
    return NextResponse.json(range)
  } catch {
    return NextResponse.json({ error: 'Failed to update IP range' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.changeLog.create({
      data: { objectType: 'IPRange', objectId: id, action: 'delete', changes: '{}' },
    })
    await prisma.iPRange.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete IP range' }, { status: 500 })
  }
}
