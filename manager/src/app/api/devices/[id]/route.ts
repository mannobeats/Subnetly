import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const cleanBody = { ...body }
    if (cleanBody.ipAddress) cleanBody.ipAddress = cleanBody.ipAddress.trim()
    if (cleanBody.name) cleanBody.name = cleanBody.name.trim()
    if (cleanBody.macAddress) cleanBody.macAddress = cleanBody.macAddress.trim()
    const device = await prisma.device.update({
      where: { id },
      data: cleanBody,
    })
    await prisma.changeLog.create({
      data: { objectType: 'Device', objectId: id, action: 'update', changes: JSON.stringify(body) },
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
    const device = await prisma.device.findUnique({ where: { id } })
    await prisma.device.delete({
      where: { id },
    })
    await prisma.changeLog.create({
      data: { objectType: 'Device', objectId: id, action: 'delete', changes: JSON.stringify({ name: device?.name, ipAddress: device?.ipAddress }) },
    })
    return NextResponse.json({ message: 'Device deleted' })
  } catch (error) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 })
  }
}
