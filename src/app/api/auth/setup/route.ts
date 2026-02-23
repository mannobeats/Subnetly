import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

export async function POST() {
  try {
    const existingUsers = await prisma.user.count()
    if (existingUsers > 0) {
      return NextResponse.json({ setup: false, message: 'Admin already exists' })
    }

    const email = process.env.ADMIN_EMAIL || 'admin@homelab.local'
    const password = process.env.ADMIN_PASSWORD || 'admin'
    const name = process.env.ADMIN_NAME || 'Administrator'

    await auth.api.signUpEmail({
      body: { email, password, name },
    })

    return NextResponse.json({ setup: true, message: 'Admin account created' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ setup: false, error: 'Failed to create admin' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    return NextResponse.json({ needsSetup: userCount === 0 })
  } catch {
    return NextResponse.json({ needsSetup: true })
  }
}
