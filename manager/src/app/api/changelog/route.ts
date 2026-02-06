import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const logs = await prisma.changeLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    })
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await prisma.changeLog.deleteMany({})
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to clear changelog' }, { status: 500 })
  }
}
