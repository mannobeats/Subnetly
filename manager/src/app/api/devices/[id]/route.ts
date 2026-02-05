import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const device = await prisma.device.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(device)
  } catch (error) {
    console.error('PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.device.delete({
      where: { id },
    })
    return NextResponse.json({ message: 'Device deleted' })
  } catch (error) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 })
  }
}
