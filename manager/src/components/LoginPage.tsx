'use client'

import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { Wifi, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

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
      <div className="login-page">
        <div className="login-card animate-fade-in">
          <div className="login-loading">
            <Loader2 size={24} className="spin" />
            <span>Initializing...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-logo">
            <Wifi size={28} />
          </div>
          <h1>Homelab Manager</h1>
          <p>Network & Infrastructure Management</p>
        </div>

        {setupMessage && (
          <div className="login-setup-notice">
            <AlertCircle size={14} />
            <div>
              <strong>{setupMessage}</strong>
              <span className="login-default-creds">
                Email: <code>{process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@homelab.local'}</code><br />
                Password: <code>{process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'}</code>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="login-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="unifi-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@homelab.local"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="login-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="unifi-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading || !email || !password}
          >
            {loading ? <><Loader2 size={14} className="spin" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <span>Self-hosted infrastructure management</span>
        </div>
      </div>
    </div>
  )
}
