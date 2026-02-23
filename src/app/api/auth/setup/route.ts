import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

function normalize(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  try {
    const existingUsers = await prisma.user.count()
    if (existingUsers > 0) {
      return NextResponse.json({ setup: false, error: 'Initial setup is already completed' }, { status: 409 })
    }

    const body = await request.json()
    const name = normalize(body?.name)
    const email = normalize(body?.email).toLowerCase()
    const password = normalize(body?.password)

    if (!name || !email || !password) {
      return NextResponse.json({ setup: false, error: 'Name, email, and password are required' }, { status: 400 })
    }
    if (!email.includes('@')) {
      return NextResponse.json({ setup: false, error: 'Enter a valid email address' }, { status: 400 })
    }
    if (password.length < 10) {
      return NextResponse.json({ setup: false, error: 'Password must be at least 10 characters' }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'production') {
      // In production, prevent trivial passwords when token gating is not configured.
      if (password.length < 12) {
        return NextResponse.json(
          { setup: false, error: 'Password must be at least 12 characters in production' },
          { status: 400 }
        )
      }
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json(
        { setup: false, error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

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
    const needsSetup = userCount === 0
    return NextResponse.json({
      needsSetup,
      setupEnabled: needsSetup,
    })
  } catch {
    return NextResponse.json({ needsSetup: true, setupEnabled: true })
  }
}
