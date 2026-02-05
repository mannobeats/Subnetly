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
