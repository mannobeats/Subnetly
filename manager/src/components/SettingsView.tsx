'use client'

import { useState, useEffect, useCallback } from 'react'
import { authClient } from '@/lib/auth-client'
import { Lock, Database, Save, Check, AlertCircle, Loader2, Plus, Trash2, Edit2, MapPin } from 'lucide-react'
import { CustomCategory, Site } from '@/types'
import { getCategoryIcon, ICON_OPTIONS, COLOR_OPTIONS, ICON_MAP } from '@/lib/category-icons'

type SettingsTab = 'profile' | 'security' | 'notifications' | 'application' | 'data' | 'about' | 'categories' | 'sites'

interface UserSession {
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

interface SettingsViewProps {
  activeTab?: SettingsTab
  categories?: CustomCategory[]
  onCategoriesChange?: () => void
  sites?: Site[]
  activeSiteId?: string | null
  onSitesChange?: () => void
}

export default function SettingsView({ activeTab = 'profile', categories = [], onCategoriesChange, sites = [], activeSiteId, onSitesChange }: SettingsViewProps) {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile form
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // App settings (stored in localStorage)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [compactMode, setCompactMode] = useState(false)
  const [showTooltips, setShowTooltips] = useState(true)
  const [defaultView, setDefaultView] = useState('dashboard')
  const [itemsPerPage, setItemsPerPage] = useState('50')
  const [confirmDeletes, setConfirmDeletes] = useState(true)
  const [changelogEnabled, setChangelogEnabled] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await authClient.getSession()
        if (res.data) {
          setSession(res.data as UserSession)
          setProfileName(res.data.user.name)
          setProfileEmail(res.data.user.email)
        }
      } catch {
        // Session fetch failed
      } finally {
        setLoading(false)
      }
    }
    fetchSession()

    // Load app settings from localStorage
    const saved = localStorage.getItem('homelab-settings')
    if (saved) {
      try {
        const s = JSON.parse(saved)
        if (s.autoRefresh !== undefined) setAutoRefresh(s.autoRefresh)
        if (s.compactMode !== undefined) setCompactMode(s.compactMode)
        if (s.showTooltips !== undefined) setShowTooltips(s.showTooltips)
        if (s.defaultView) setDefaultView(s.defaultView)
        if (s.itemsPerPage) setItemsPerPage(s.itemsPerPage)
        if (s.confirmDeletes !== undefined) setConfirmDeletes(s.confirmDeletes)
        if (s.changelogEnabled !== undefined) setChangelogEnabled(s.changelogEnabled)
      } catch { /* ignore */ }
    }
  }, [])

  const saveAppSettings = () => {
    const settings = { autoRefresh, compactMode, showTooltips, defaultView, itemsPerPage, confirmDeletes, changelogEnabled }
    localStorage.setItem('homelab-settings', JSON.stringify(settings))
  }

  useEffect(() => {
    saveAppSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, compactMode, showTooltips, defaultView, itemsPerPage, confirmDeletes, changelogEnabled])

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileSuccess(false)
    try {
      await authClient.updateUser({
        name: profileName,
      })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch {
      // Error saving profile
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setPasswordSaving(true)
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      })
      if (result.error) {
        setPasswordError(result.error.message || 'Failed to change password')
      } else {
        setPasswordSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPasswordSuccess(false), 3000)
      }
    } catch {
      setPasswordError('An error occurred')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return <div className="view-loading"><Loader2 size={20} className="spin" /> Loading settings...</div>
  }

  const initials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

  return (
    <div className="settings-view animate-fade-in">
        <div className="settings-panel">
          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <>
              <h2>Profile</h2>
              <p className="settings-panel-desc">Manage your account information</p>

              <div className="settings-section">
                <div className="settings-avatar">{initials}</div>
                <div className="input-group">
                  <label className="input-label">Display Name</label>
                  <input
                    type="text"
                    className="unifi-input"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    className="unifi-input"
                    value={profileEmail}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--unifi-text-muted)', marginTop: '4px', display: 'block' }}>
                    Email cannot be changed for security reasons
                  </span>
                </div>
                <div className="settings-actions">
                  <button className="btn btn-primary" onClick={handleProfileSave} disabled={profileSaving}>
                    {profileSaving ? <><Loader2 size={14} className="spin" /> Saving...</> :
                     profileSuccess ? <><Check size={14} /> Saved!</> :
                     <><Save size={14} /> Save Changes</>}
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3>Account Information</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">User ID</div>
                    <div className="settings-row-desc">Your unique account identifier</div>
                  </div>
                  <span className="settings-row-value" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                    {session?.user?.id || '—'}
                  </span>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Role</div>
                    <div className="settings-row-desc">Your access level</div>
                  </div>
                  <span className="badge badge-blue">Administrator</span>
                </div>
              </div>
            </>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <>
              <h2>Security</h2>
              <p className="settings-panel-desc">Manage your password and security settings</p>

              <div className="settings-section">
                <h3>Change Password</h3>
                {passwordError && (
                  <div className="login-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={14} />
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="login-setup-notice" style={{ marginBottom: '1rem', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
                    <Check size={14} />
                    <span>Password changed successfully</span>
                  </div>
                )}
                <div className="input-group">
                  <label className="input-label">Current Password</label>
                  <input
                    type="password"
                    className="unifi-input"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">New Password</label>
                  <input
                    type="password"
                    className="unifi-input"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="unifi-input"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="settings-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handlePasswordChange}
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {passwordSaving ? <><Loader2 size={14} className="spin" /> Changing...</> : <><Lock size={14} /> Change Password</>}
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3>Session</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Session Duration</div>
                    <div className="settings-row-desc">How long you stay signed in</div>
                  </div>
                  <span className="settings-row-value">7 days</span>
                </div>
              </div>
            </>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <>
              <h2>Notifications</h2>
              <p className="settings-panel-desc">Configure notification preferences</p>

              <div className="settings-section">
                <h3>Changelog Tracking</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Enable Changelog</div>
                    <div className="settings-row-desc">Track all changes made to devices, subnets, and services</div>
                  </div>
                  <button
                    className={`settings-toggle ${changelogEnabled ? 'active' : ''}`}
                    onClick={() => setChangelogEnabled(!changelogEnabled)}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── APPLICATION ── */}
          {activeTab === 'application' && (
            <>
              <h2>Application</h2>
              <p className="settings-panel-desc">Customize the application behavior</p>

              <div className="settings-section">
                <h3>General</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Default View</div>
                    <div className="settings-row-desc">The view shown when you open the app</div>
                  </div>
                  <select
                    className="unifi-input"
                    style={{ width: '160px' }}
                    value={defaultView}
                    onChange={e => setDefaultView(e.target.value)}
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="devices">Devices</option>
                    <option value="ipam">IP Planner</option>
                    <option value="vlans">VLANs</option>
                    <option value="services">Services</option>
                  </select>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Items Per Page</div>
                    <div className="settings-row-desc">Number of items shown in tables</div>
                  </div>
                  <select
                    className="unifi-input"
                    style={{ width: '100px' }}
                    value={itemsPerPage}
                    onChange={e => setItemsPerPage(e.target.value)}
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>Display</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Auto-Refresh Data</div>
                    <div className="settings-row-desc">Automatically refresh data when switching views</div>
                  </div>
                  <button
                    className={`settings-toggle ${autoRefresh ? 'active' : ''}`}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  />
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Compact Mode</div>
                    <div className="settings-row-desc">Reduce spacing for denser information display</div>
                  </div>
                  <button
                    className={`settings-toggle ${compactMode ? 'active' : ''}`}
                    onClick={() => setCompactMode(!compactMode)}
                  />
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Show Tooltips</div>
                    <div className="settings-row-desc">Display helpful tooltips on hover</div>
                  </div>
                  <button
                    className={`settings-toggle ${showTooltips ? 'active' : ''}`}
                    onClick={() => setShowTooltips(!showTooltips)}
                  />
                </div>
              </div>

              <div className="settings-section">
                <h3>Safety</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Confirm Deletions</div>
                    <div className="settings-row-desc">Show confirmation dialog before deleting items</div>
                  </div>
                  <button
                    className={`settings-toggle ${confirmDeletes ? 'active' : ''}`}
                    onClick={() => setConfirmDeletes(!confirmDeletes)}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── DATA & STORAGE ── */}
          {activeTab === 'data' && (
            <>
              <h2>Data & Storage</h2>
              <p className="settings-panel-desc">Manage your data and database</p>

              <div className="settings-section">
                <h3>Database</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Database Type</div>
                    <div className="settings-row-desc">The database engine powering the application</div>
                  </div>
                  <span className="badge badge-blue">PostgreSQL</span>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">ORM</div>
                    <div className="settings-row-desc">Object-Relational Mapping layer</div>
                  </div>
                  <span className="settings-row-value">Prisma 7</span>
                </div>
              </div>

              <div className="settings-section">
                <h3>Export</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Export All Data</div>
                    <div className="settings-row-desc">Download all your data as a JSON file</div>
                  </div>
                  <button className="btn" onClick={async () => {
                    const [devices, subnets, vlans, services] = await Promise.all([
                      fetch('/api/devices').then(r => r.json()),
                      fetch('/api/subnets').then(r => r.json()),
                      fetch('/api/vlans').then(r => r.json()),
                      fetch('/api/services').then(r => r.json()),
                    ])
                    const data = { exportedAt: new Date().toISOString(), devices, subnets, vlans, services }
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `homelab-export-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}>
                    <Database size={14} /> Export JSON
                  </button>
                </div>
              </div>

              <div className="settings-section settings-danger-zone">
                <h3>Danger Zone</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Clear All Data</div>
                    <div className="settings-row-desc">Permanently delete all devices, subnets, VLANs, services, and changelog entries</div>
                  </div>
                  <button className="btn btn-destructive" onClick={async () => {
                    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                      if (confirm('This is your last chance. Type OK to confirm.')) {
                        await fetch('/api/changelog', { method: 'DELETE' })
                        alert('Data cleared. Refresh the page.')
                      }
                    }
                  }}>
                    Clear All Data
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── CATEGORIES ── */}
          {activeTab === 'categories' && (
            <CategoriesTab categories={categories} onCategoriesChange={onCategoriesChange} />
          )}

          {/* ── SITES ── */}
          {activeTab === 'sites' && (
            <SitesTab sites={sites} activeSiteId={activeSiteId} onSitesChange={onSitesChange} />
          )}

          {/* ── ABOUT ── */}
          {activeTab === 'about' && (
            <>
              <h2>About</h2>
              <p className="settings-panel-desc">Application information</p>

              <div className="settings-section">
                <h3>Homelab Manager</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Version</div>
                  </div>
                  <span className="settings-row-value">0.1.0</span>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Framework</div>
                  </div>
                  <span className="settings-row-value">Next.js 16</span>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Database</div>
                  </div>
                  <span className="settings-row-value">PostgreSQL 16</span>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Authentication</div>
                  </div>
                  <span className="settings-row-value">Better Auth</span>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Runtime</div>
                  </div>
                  <span className="settings-row-value">Docker</span>
                </div>
              </div>

              <div className="settings-section">
                <h3>Features</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {['Device Management', 'IP Planning (IPAM)', 'VLAN Management', 'Network Topology', 'Service Tracking', 'Changelog Audit', 'Multi-Site Support', 'Custom Categories', 'Export/Import', 'Authentication'].map(f => (
                    <span key={f} className="badge badge-blue">{f}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  )
}

function CategoriesTab({ categories, onCategoriesChange }: { categories: CustomCategory[], onCategoriesChange?: () => void }) {
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('server')
  const [newColor, setNewColor] = useState('#5e6670')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), icon: newIcon, color: newColor }),
    })
    setNewName('')
    setNewIcon('server')
    setNewColor('#5e6670')
    onCategoriesChange?.()
  }

  const handleUpdate = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, icon: editIcon, color: editColor }),
    })
    setEditingId(null)
    onCategoriesChange?.()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    onCategoriesChange?.()
  }

  const startEdit = (cat: CustomCategory) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditIcon(cat.icon)
    setEditColor(cat.color)
  }

  return (
    <>
      <h2>Categories</h2>
      <p className="settings-panel-desc">Manage device categories with custom icons and colors</p>

      <div className="settings-section">
        <h3>Add New Category</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '140px' }}>
            <label className="input-label">Name</label>
            <input className="unifi-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Firewall" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className="input-group" style={{ width: '120px' }}>
            <label className="input-label">Icon</label>
            <select className="unifi-input" value={newIcon} onChange={e => setNewIcon(e.target.value)}>
              {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ width: '60px' }}>
            <label className="input-label">Color</label>
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: '100%', height: '34px', padding: '2px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }} />
          </div>
          <button className="btn btn-primary" style={{ height: '34px' }} onClick={handleCreate} disabled={!newName.trim()}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Current Categories ({categories.length})</h3>
        {categories.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No categories yet. Add one above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map(cat => {
              const Icon = getCategoryIcon(cat.icon)
              if (editingId === cat.id) {
                return (
                  <div key={cat.id} className="settings-row" style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                      <input className="unifi-input" style={{ width: '140px', height: '30px' }} value={editName} onChange={e => setEditName(e.target.value)} />
                      <select className="unifi-input" style={{ width: '110px', height: '30px' }} value={editIcon} onChange={e => setEditIcon(e.target.value)}>
                        {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '36px', height: '30px', padding: '2px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }} />
                      <button className="btn btn-primary" style={{ height: '30px', padding: '0 10px', fontSize: '11px' }} onClick={() => handleUpdate(cat.id)}>
                        <Check size={12} /> Save
                      </button>
                      <button className="btn" style={{ height: '30px', padding: '0 10px', fontSize: '11px' }} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={cat.id} className="settings-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={cat.color} />
                    </div>
                    <div>
                      <div className="settings-row-label">{cat.name}</div>
                      <div className="settings-row-desc">{cat.icon} · {cat.color}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn" style={{ padding: '4px 8px', border: 'none', background: 'transparent' }} onClick={() => startEdit(cat)} title="Edit">
                      <Edit2 size={13} />
                    </button>
                    <button className="btn" style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: 'var(--red)' }} onClick={() => handleDelete(cat.id)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Icon Preview</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {ICON_OPTIONS.map(name => {
            const Ic = ICON_MAP[name]
            return (
              <div key={name} title={name} style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--muted-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Ic size={16} color="var(--text-muted)" />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function SitesTab({ sites, activeSiteId, onSitesChange }: { sites: Site[], activeSiteId?: string | null, onSitesChange?: () => void }) {
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    })
    setNewName('')
    setNewDesc('')
    onSitesChange?.()
  }

  const handleUpdate = async (id: string) => {
    await fetch(`/api/sites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, description: editDesc || null }),
    })
    setEditingId(null)
    onSitesChange?.()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this site and all its data? This cannot be undone.')) return
    await fetch(`/api/sites/${id}`, { method: 'DELETE' })
    onSitesChange?.()
  }

  return (
    <>
      <h2>Sites</h2>
      <p className="settings-panel-desc">Manage your sites (projects/homelabs). Each site has its own devices, subnets, VLANs, and categories.</p>

      <div className="settings-section">
        <h3>Create New Site</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '160px' }}>
            <label className="input-label">Site Name</label>
            <input className="unifi-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Home Lab" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: '160px' }}>
            <label className="input-label">Description (optional)</label>
            <input className="unifi-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Main rack in basement" />
          </div>
          <button className="btn btn-primary" style={{ height: '34px' }} onClick={handleCreate} disabled={!newName.trim()}>
            <Plus size={14} /> Create Site
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Your Sites ({sites.length})</h3>
        {sites.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No sites yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sites.map(site => {
              if (editingId === site.id) {
                return (
                  <div key={site.id} className="settings-row" style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                      <input className="unifi-input" style={{ width: '160px', height: '30px' }} value={editName} onChange={e => setEditName(e.target.value)} />
                      <input className="unifi-input" style={{ width: '200px', height: '30px' }} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" />
                      <button className="btn btn-primary" style={{ height: '30px', padding: '0 10px', fontSize: '11px' }} onClick={() => handleUpdate(site.id)}>
                        <Check size={12} /> Save
                      </button>
                      <button className="btn" style={{ height: '30px', padding: '0 10px', fontSize: '11px' }} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={site.id} className="settings-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: site.id === activeSiteId ? 'var(--blue-bg)' : 'var(--muted-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={16} color={site.id === activeSiteId ? 'var(--blue)' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <div className="settings-row-label">
                        {site.name}
                        {site.id === activeSiteId && <span className="badge badge-blue" style={{ marginLeft: '0.5rem', fontSize: '9px' }}>Active</span>}
                      </div>
                      <div className="settings-row-desc">
                        {site.description || 'No description'}
                        {site._count && <span> · {site._count.devices} devices · {site._count.subnets} subnets · {site._count.vlans} VLANs</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn" style={{ padding: '4px 8px', border: 'none', background: 'transparent' }} onClick={() => { setEditingId(site.id); setEditName(site.name); setEditDesc(site.description || '') }} title="Edit">
                      <Edit2 size={13} />
                    </button>
                    {sites.length > 1 && (
                      <button className="btn" style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: 'var(--red)' }} onClick={() => handleDelete(site.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
