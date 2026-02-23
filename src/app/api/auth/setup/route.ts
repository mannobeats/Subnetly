import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

const isProduction = process.env.NODE_ENV === 'production'

export async function POST(request: Request) {
  try {
    const existingUsers = await prisma.user.count()
    if (existingUsers > 0) {
      return NextResponse.json({ setup: false, message: 'Admin already exists' })
    }

    if (isProduction) {
      const setupToken = process.env.SETUP_TOKEN
      if (!setupToken) {
        return NextResponse.json(
          { setup: false, error: 'Initial setup is disabled in production. Set SETUP_TOKEN to enable.' },
          { status: 403 }
        )
      }

      const providedToken = request.headers.get('x-setup-token')
      if (!providedToken || providedToken !== setupToken) {
        return NextResponse.json({ setup: false, error: 'Invalid setup token' }, { status: 401 })
      }
    }

    const email = process.env.ADMIN_EMAIL || 'admin@subnetly.local'
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    const name = process.env.ADMIN_NAME || 'Administrator'

    if (isProduction && (password === 'admin123' || password.length < 12)) {
      return NextResponse.json(
        { setup: false, error: 'ADMIN_PASSWORD must be set to a strong value (at least 12 chars) in production.' },
        { status: 400 }
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
    return NextResponse.json({
      needsSetup: userCount === 0,
      setupEnabled: !isProduction || Boolean(process.env.SETUP_TOKEN),
    })
  } catch {
    return NextResponse.json({ needsSetup: true, setupEnabled: !isProduction })
  }
}
