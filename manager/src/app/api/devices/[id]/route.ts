import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const device = await prisma.device.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(device)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.device.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ message: 'Device deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 })
  }
}
