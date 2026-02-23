'use client'

import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { Wifi, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [setupMessage, setSetupMessage] = useState('')

  useEffect(() => {
    const checkAndSetup = async () => {
      try {
        const res = await fetch('/api/auth/setup')
        const data = await res.json()
        if (data.needsSetup) {
          const setupRes = await fetch('/api/auth/setup', { method: 'POST' })
          const setupData = await setupRes.json()
          if (setupData.setup) {
            setSetupMessage('Default admin account created. Sign in with the credentials below.')
          }
        }
      } catch {
        // Setup check failed, continue to login
      } finally {
        setCheckingSetup(false)
      }
    }
    checkAndSetup()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })

      if (result.error) {
        setError(result.error.message || 'Invalid email or password')
        setLoading(false)
        return
      }

      onLogin()
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (checkingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--gradient-login-bg)' }}>
        <div className={cn(
          "w-full max-w-[400px] rounded-xl border border-border bg-card p-10",
          "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.08)]",
          "animate-in fade-in slide-in-from-bottom-1 duration-300"
        )}>
          <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground text-[13px]">
            <Loader2 size={24} className="animate-spin" />
            <span>Initializing...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--gradient-login-bg)' }}>
      <div className={cn(
        "w-full max-w-[400px] rounded-xl border border-border bg-card p-10",
        "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.08)]",
        "animate-in fade-in slide-in-from-bottom-1 duration-300"
      )}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-linear-to-br from-(--blue) to-(--blue-light) text-white">
            <Wifi size={28} />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Subnetly</h1>
          <p className="text-[13px] text-muted-foreground">Network & Infrastructure Management</p>
        </div>

        {setupMessage && (
          <div className="mb-6 flex gap-3 items-start rounded-md border border-(--info-border) bg-(--blue-bg) p-3 text-xs text-(--info-text)">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <strong className="block mb-1">{setupMessage}</strong>
              <span className="block mt-1 text-[11px] text-(--info-accent) leading-relaxed">
                Email: <code className="rounded bg-(--info-code-bg) px-1.5 py-px text-[11px]">{process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@homelab.local'}</code><br />
                Password: <code className="rounded bg-(--info-code-bg) px-1.5 py-px text-[11px]">{process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'}</code>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-(--red-border) bg-(--red-bg) p-3 text-xs text-(--red)">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-5">
            <Label htmlFor="email" className="mb-2 block text-xs font-semibold text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@homelab.local"
              required
              autoFocus
              autoComplete="email"
              className="h-9 text-[13px] bg-(--surface-alt) border-border focus:border-(--blue) focus:bg-card"
            />
          </div>

          <div className="mb-5">
            <Label htmlFor="password" className="mb-2 block text-xs font-semibold text-muted-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="h-9 pr-10 text-[13px] bg-(--surface-alt) border-border focus:border-(--blue) focus:bg-card"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="mt-2 w-full h-10 text-sm font-semibold"
            disabled={loading || !email || !password}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center text-[11px] text-(--text-light)">
          <span>Self-hosted infrastructure management</span>
        </div>
      </div>
    </div>
  )
}
