'use client'

import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { Lock, Save, Check, AlertCircle, Loader2, Plus, Trash2, Edit2, MapPin, Activity, Upload, Download } from 'lucide-react'
import { CustomCategory, Site } from '@/types'
import { renderCategoryIcon } from '@/lib/category-icons'
import IconPicker from '@/components/IconPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

type SettingsTab = 'profile' | 'security' | 'notifications' | 'application' | 'data' | 'about' | 'categories' | 'sites' | 'vlan-roles'

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
  vlanRoles?: CustomCategory[]
  onCategoriesChange?: () => void
  sites?: Site[]
  activeSiteId?: string | null
  onSitesChange?: () => void
}

export default function SettingsView({ activeTab = 'profile', categories = [], vlanRoles = [], onCategoriesChange, sites = [], activeSiteId, onSitesChange }: SettingsViewProps) {
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
  const [showTooltips, setShowTooltips] = useState(true)
  const [defaultView, setDefaultView] = useState('dashboard')
  const [itemsPerPage, setItemsPerPage] = useState('50')
  const [confirmDeletes, setConfirmDeletes] = useState(true)
  const [changelogEnabled, setChangelogEnabled] = useState(true)

  // Health check settings (stored in DB via API)
  const [hcEnabled, setHcEnabled] = useState(false)
  const [hcInterval, setHcInterval] = useState(300)
  const [hcTimeout, setHcTimeout] = useState(10)
  const [hcSaving, setHcSaving] = useState(false)
  const [hcSuccess, setHcSuccess] = useState(false)

  // Import/Export state
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; counts?: Record<string, number> } | null>(null)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)

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

    // Load health check settings from API
    fetch('/api/settings').then(r => r.ok ? r.json() : null).then(s => {
      if (s) {
        setHcEnabled(s.healthCheckEnabled ?? false)
        setHcInterval(s.healthCheckInterval ?? 300)
        setHcTimeout(s.healthCheckTimeout ?? 10)
      }
    }).catch(() => {})

    // Load app settings from localStorage
    const saved = localStorage.getItem('homelab-settings')
    if (saved) {
      try {
        const s = JSON.parse(saved)
        if (s.autoRefresh !== undefined) setAutoRefresh(s.autoRefresh)
        if (s.showTooltips !== undefined) setShowTooltips(s.showTooltips)
        if (s.defaultView) setDefaultView(s.defaultView)
        if (s.itemsPerPage) setItemsPerPage(s.itemsPerPage)
        if (s.confirmDeletes !== undefined) setConfirmDeletes(s.confirmDeletes)
        if (s.changelogEnabled !== undefined) setChangelogEnabled(s.changelogEnabled)
      } catch { /* ignore */ }
    }
  }, [])

  const saveAppSettings = () => {
    const settings = { autoRefresh, showTooltips, defaultView, itemsPerPage, confirmDeletes, changelogEnabled }
    localStorage.setItem('homelab-settings', JSON.stringify(settings))
  }

  useEffect(() => {
    saveAppSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, showTooltips, defaultView, itemsPerPage, confirmDeletes, changelogEnabled])

  const handleHealthCheckSave = async () => {
    setHcSaving(true)
    setHcSuccess(false)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ healthCheckEnabled: hcEnabled, healthCheckInterval: hcInterval, healthCheckTimeout: hcTimeout }),
      })
      setHcSuccess(true)
      setTimeout(() => setHcSuccess(false), 3000)
    } catch { /* */ } finally {
      setHcSaving(false)
    }
  }

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileSuccess(false)
    try {
      await authClient.updateUser({
        name: profileName,
      })
      if (profileEmail !== session?.user?.email) {
        await authClient.changeEmail({ newEmail: profileEmail })
      }
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
    return <div className="flex items-center justify-center h-[200px] gap-2 text-muted-foreground text-[13px]"><Loader2 size={20} className="animate-spin" /> Loading settings...</div>
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
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Display Name</Label>
                  <Input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Email Address</Label>
                  <Input
                    type="email"
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="settings-actions">
                  <Button onClick={handleProfileSave} disabled={profileSaving}>
                    {profileSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> :
                     profileSuccess ? <><Check size={14} /> Saved!</> :
                     <><Save size={14} /> Save Changes</>}
                  </Button>
                </div>
              </div>

              <div className="settings-section">
                <h3>Account Information</h3>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">User ID</div>
                    <div className="settings-row-desc">Your unique account identifier</div>
                  </div>
                  <span className="settings-row-value font-mono text-[11px]">
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
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[13px]">
                    <AlertCircle size={14} />
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-[13px]">
                    <Check size={14} />
                    <span>Password changed successfully</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="settings-actions">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {passwordSaving ? <><Loader2 size={14} className="animate-spin" /> Changing...</> : <><Lock size={14} /> Change Password</>}
                  </Button>
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
                    className="unifi-input w-40"
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
                    className="unifi-input w-[100px]"
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

              <div className="settings-section">
                <h3 className="flex items-center gap-2"><Activity size={16} className="text-[#22c55e]" /> Health Checks</h3>
                <p className="text-xs text-(--text-light) mb-4">
                  Automatically monitor your services by pinging their URLs at regular intervals. Services must have a URL and health check enabled individually.
                </p>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Enable Auto Health Checks</div>
                    <div className="settings-row-desc">Globally enable or disable automatic health monitoring</div>
                  </div>
                  <button
                    className={`settings-toggle ${hcEnabled ? 'active' : ''}`}
                    onClick={() => setHcEnabled(!hcEnabled)}
                  />
                </div>
                {hcEnabled && (
                  <>
                    <div className="settings-row">
                      <div>
                        <div className="settings-row-label">Check Interval</div>
                        <div className="settings-row-desc">How often to ping service URLs</div>
                      </div>
                      <select
                        className="unifi-input w-40"
                        value={hcInterval}
                        onChange={e => setHcInterval(parseInt(e.target.value))}
                      >
                        <option value="60">Every 1 minute</option>
                        <option value="120">Every 2 minutes</option>
                        <option value="300">Every 5 minutes</option>
                        <option value="600">Every 10 minutes</option>
                        <option value="900">Every 15 minutes</option>
                        <option value="1800">Every 30 minutes</option>
                        <option value="3600">Every 1 hour</option>
                      </select>
                    </div>
                    <div className="settings-row">
                      <div>
                        <div className="settings-row-label">Request Timeout</div>
                        <div className="settings-row-desc">Max seconds to wait for a response before marking as down</div>
                      </div>
                      <select
                        className="unifi-input w-[120px]"
                        value={hcTimeout}
                        onChange={e => setHcTimeout(parseInt(e.target.value))}
                      >
                        <option value="5">5 seconds</option>
                        <option value="10">10 seconds</option>
                        <option value="15">15 seconds</option>
                        <option value="30">30 seconds</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="flex justify-end mt-4">
                  <Button onClick={handleHealthCheckSave} disabled={hcSaving}>
                    {hcSaving ? <Loader2 size={14} className="animate-spin" /> : hcSuccess ? <Check size={14} /> : <Save size={14} />}
                    {hcSaving ? 'Saving...' : hcSuccess ? 'Saved!' : 'Save Health Check Settings'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── DATA & STORAGE ── */}
          {activeTab === 'data' && (
            <>
              <h2>Data & Storage</h2>
              <p className="settings-panel-desc">Manage your data, backups, and database</p>

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
                <h3>Backup & Export</h3>
                <p className="text-xs text-(--text-light) mb-4">
                  Export a full backup of the current site including all devices, subnets, VLANs, IP addresses, services, WiFi networks, categories, and changelog.
                </p>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Export Full Backup</div>
                    <div className="settings-row-desc">Download a complete JSON backup of all site data</div>
                  </div>
                  <Button variant="outline" disabled={exporting} onClick={async () => {
                    setExporting(true)
                    try {
                      const res = await fetch('/api/backup/export')
                      if (!res.ok) throw new Error('Export failed')
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const disposition = res.headers.get('Content-Disposition')
                      const filename = disposition?.match(/filename="(.+)"/)?.[1] || `homelab-backup-${new Date().toISOString().split('T')[0]}.json`
                      const a = document.createElement('a')
                      a.href = url
                      a.download = filename
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch {
                      alert('Failed to export backup')
                    } finally {
                      setExporting(false)
                    }
                  }}>
                    {exporting ? <><Loader2 size={14} className="animate-spin" /> Exporting...</> : <><Download size={14} /> Export Backup</>}
                  </Button>
                </div>
              </div>

              <div className="settings-section">
                <h3>Restore from Backup</h3>
                <p className="text-xs text-(--text-light) mb-4">
                  Import a previously exported JSON backup. <strong className="text-(--red)">Warning:</strong> This will replace ALL data in the current site.
                </p>
                {importResult && (
                  <div className="px-4 py-3 rounded-md mb-4 text-xs" style={{
                    background: importResult.success ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: importResult.success ? 'var(--green)' : 'var(--red)',
                    border: `1px solid ${importResult.success ? 'var(--green)' : 'var(--red-border)'}`,
                  }}>
                    <div className="font-semibold" style={{ marginBottom: importResult.counts ? '0.5rem' : 0 }}>
                      {importResult.success ? <><Check size={12} className="inline mr-1" />Import successful!</> : <><AlertCircle size={12} className="inline mr-1" />{importResult.message}</>}
                    </div>
                    {importResult.counts && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(importResult.counts).filter(([, v]) => v > 0).map(([k, v]) => (
                          <span key={k} className="bg-white/50 px-1.5 py-px rounded">{v} {k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Import Backup File</div>
                    <div className="settings-row-desc">Select a .json backup file to restore</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-md border border-border bg-card text-[13px] font-medium hover:bg-accent transition-colors">
                      <Upload size={14} /> Choose File
                      <input type="file" accept=".json" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setPendingImportFile(file)
                          setImportConfirmOpen(true)
                        }
                        e.target.value = ''
                      }} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-section settings-danger-zone">
                <h3>Danger Zone</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="settings-row-label">Clear All Data</div>
                    <div className="settings-row-desc">Permanently delete all devices, subnets, VLANs, services, and changelog entries</div>
                  </div>
                  <div>
                    <Button variant="destructive" onClick={async () => {
                      if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                        if (confirm('This is your last chance. All site data will be permanently deleted.')) {
                          try {
                            await fetch('/api/backup/import', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ version: '1.0', site: { name: 'cleared' }, categories: [], vlans: [], subnets: [], devices: [], ipAddresses: [], ipRanges: [], services: [], wifiNetworks: [], changeLogs: [] }),
                            })
                            alert('All data cleared. The page will now reload.')
                            window.location.reload()
                          } catch {
                            alert('Failed to clear data')
                          }
                        }
                      }
                    }}>
                      Clear All Data
                    </Button>
                  </div>
                </div>
              </div>

              {/* Import Confirmation Modal */}
              <Dialog open={importConfirmOpen && !!pendingImportFile} onOpenChange={(open) => { if (!open) { setImportConfirmOpen(false); setPendingImportFile(null) } }}>
                <DialogContent className="max-w-[440px] text-center">
                  <DialogHeader className="flex flex-col items-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--orange-bg) text-(--orange)">
                      <Upload size={24} />
                    </div>
                    <DialogTitle className="text-lg font-semibold">Restore from Backup?</DialogTitle>
                    <DialogDescription className="mt-2">
                      This will <strong>replace all data</strong> in the current site with the contents of:
                    </DialogDescription>
                  </DialogHeader>
                  <p className="font-mono text-xs bg-(--muted-bg) px-3 py-1.5 rounded break-all mb-4">
                    {pendingImportFile?.name}
                  </p>
                  <p className="text-(--red) text-xs mb-4">
                    This action cannot be undone. Export a backup first if needed.
                  </p>
                  <DialogFooter className="flex justify-center gap-4 sm:justify-center">
                    <Button variant="outline" onClick={() => { setImportConfirmOpen(false); setPendingImportFile(null) }}>Cancel</Button>
                    <Button variant="destructive" disabled={importing} onClick={async () => {
                      setImporting(true)
                      setImportResult(null)
                      try {
                        const text = await pendingImportFile!.text()
                        const data = JSON.parse(text)
                        const res = await fetch('/api/backup/import', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(data),
                        })
                        const result = await res.json()
                        if (res.ok) {
                          setImportResult({ success: true, message: 'Import successful', counts: result.counts })
                          setImportConfirmOpen(false)
                          setPendingImportFile(null)
                          onCategoriesChange?.()
                          onSitesChange?.()
                        } else {
                          setImportResult({ success: false, message: result.error || 'Import failed' })
                          setImportConfirmOpen(false)
                          setPendingImportFile(null)
                        }
                      } catch (err) {
                        setImportResult({ success: false, message: err instanceof Error ? err.message : 'Invalid backup file' })
                        setImportConfirmOpen(false)
                        setPendingImportFile(null)
                      } finally {
                        setImporting(false)
                      }
                    }}>
                      {importing ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : 'Restore Backup'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

          {/* ── VLAN ROLES ── */}
          {activeTab === 'vlan-roles' && (
            <VlanRolesTab roles={vlanRoles} onRolesChange={onCategoriesChange} />
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
                <div className="flex flex-wrap gap-2">
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
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Name</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Firewall" onKeyDown={e => e.key === 'Enter' && handleCreate()} className="h-9 text-[13px]" />
          </div>
          <div className="w-[140px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Icon</Label>
            <IconPicker value={newIcon} onChange={setNewIcon} color={newColor} />
          </div>
          <div className="w-[60px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Color</Label>
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-full h-[34px] p-0.5 border border-border rounded cursor-pointer" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <Plus size={14} /> Add Category
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Current Categories ({categories.length})</h3>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">No categories yet. Add one above.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map(cat => {
              if (editingId === cat.id) {
                return (
                  <div key={cat.id} className="settings-row p-3">
                    <div className="flex gap-2 items-center flex-1 flex-wrap">
                      <Input className="w-[140px] h-[30px] text-[13px]" value={editName} onChange={e => setEditName(e.target.value)} />
                      <div className="w-[120px]">
                        <IconPicker value={editIcon} onChange={setEditIcon} color={editColor} />
                      </div>
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-9 h-[30px] p-0.5 border border-border rounded cursor-pointer" />
                      <Button size="sm" className="h-[30px] px-2.5 text-[11px]" onClick={() => handleUpdate(cat.id)}>
                        <Check size={12} /> Save
                      </Button>
                      <Button variant="outline" size="sm" className="h-[30px] px-2.5 text-[11px]" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                )
              }
              return (
                <CatRow key={cat.id} cat={cat} onEdit={startEdit} onDelete={handleDelete} />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function CatRow({ cat, onEdit, onDelete }: { cat: CustomCategory, onEdit: (c: CustomCategory) => void, onDelete: (id: string) => void }) {
  return (
    <div className="settings-row">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cat.color + '18' }}>
          {renderCategoryIcon(cat.icon, 16, cat.color)}
        </div>
        <div>
          <div className="settings-row-label">{cat.name}</div>
          <div className="settings-row-desc">{cat.icon} · {cat.color}</div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cat)} title="Edit">
          <Edit2 size={13} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-(--red) hover:text-(--red)" onClick={() => onDelete(cat.id)} title="Delete">
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
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
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Site Name</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Home Lab" onKeyDown={e => e.key === 'Enter' && handleCreate()} className="h-9 text-[13px]" />
          </div>
          <div className="flex-1 min-w-[160px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Description (optional)</Label>
            <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Main rack in basement" className="h-9 text-[13px]" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <Plus size={14} /> Create Site
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Your Sites ({sites.length})</h3>
        {sites.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">No sites yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sites.map(site => {
              if (editingId === site.id) {
                return (
                  <div key={site.id} className="settings-row p-3">
                    <div className="flex gap-2 items-center flex-1 flex-wrap">
                      <Input className="w-40 h-[30px] text-[13px]" value={editName} onChange={e => setEditName(e.target.value)} />
                      <Input className="w-[200px] h-[30px] text-[13px]" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" />
                      <Button size="sm" className="h-[30px] px-2.5 text-[11px]" onClick={() => handleUpdate(site.id)}>
                        <Check size={12} /> Save
                      </Button>
                      <Button variant="outline" size="sm" className="h-[30px] px-2.5 text-[11px]" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={site.id} className="settings-row">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: site.id === activeSiteId ? 'var(--blue-bg)' : 'var(--muted-bg)' }}>
                      <MapPin size={16} color={site.id === activeSiteId ? 'var(--blue)' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <div className="settings-row-label">
                        {site.name}
                        {site.id === activeSiteId && <span className="badge badge-blue ml-2 text-[9px]">Active</span>}
                      </div>
                      <div className="settings-row-desc">
                        {site.description || 'No description'}
                        {site._count && <span> · {site._count.devices} devices · {site._count.subnets} subnets · {site._count.vlans} VLANs</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(site.id); setEditName(site.name); setEditDesc(site.description || '') }} title="Edit">
                      <Edit2 size={13} />
                    </Button>
                    {sites.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-(--red) hover:text-(--red)" onClick={() => handleDelete(site.id)} title="Delete">
                        <Trash2 size={13} />
                      </Button>
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

function VlanRolesTab({ roles, onRolesChange }: { roles: CustomCategory[], onRolesChange?: () => void }) {
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('shield')
  const [newColor, setNewColor] = useState('#0055ff')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), icon: newIcon, color: newColor, type: 'vlan_role' }),
    })
    setNewName('')
    setNewIcon('shield')
    setNewColor('#0055ff')
    onRolesChange?.()
  }

  const handleUpdate = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, icon: editIcon, color: editColor }),
    })
    setEditingId(null)
    onRolesChange?.()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this VLAN role?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    onRolesChange?.()
  }

  return (
    <>
      <h2>VLAN Roles</h2>
      <p className="settings-panel-desc">Manage custom VLAN roles used to categorize your VLANs</p>

      <div className="settings-section">
        <h3>Add New Role</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Name</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. DMZ" onKeyDown={e => e.key === 'Enter' && handleCreate()} className="h-9 text-[13px]" />
          </div>
          <div className="w-[140px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Icon</Label>
            <IconPicker value={newIcon} onChange={setNewIcon} color={newColor} />
          </div>
          <div className="w-[60px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Color</Label>
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-full h-[34px] p-0.5 border border-border rounded cursor-pointer" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <Plus size={14} /> Add Role
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Current Roles ({roles.length})</h3>
        {roles.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">No VLAN roles yet. Add one above.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {roles.map(role => {
              if (editingId === role.id) {
                return (
                  <div key={role.id} className="settings-row p-3">
                    <div className="flex gap-2 items-center flex-1 flex-wrap">
                      <Input className="w-[140px] h-[30px] text-[13px]" value={editName} onChange={e => setEditName(e.target.value)} />
                      <div className="w-[120px]">
                        <IconPicker value={editIcon} onChange={setEditIcon} color={editColor} />
                      </div>
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-9 h-[30px] p-0.5 border border-border rounded cursor-pointer" />
                      <Button size="sm" className="h-[30px] px-2.5 text-[11px]" onClick={() => handleUpdate(role.id)}>
                        <Check size={12} /> Save
                      </Button>
                      <Button variant="outline" size="sm" className="h-[30px] px-2.5 text-[11px]" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={role.id} className="settings-row">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: role.color + '18' }}>
                      {renderCategoryIcon(role.icon, 16, role.color)}
                    </div>
                    <div>
                      <div className="settings-row-label">{role.name}</div>
                      <div className="settings-row-desc">{role.slug} · {role.color}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(role.id); setEditName(role.name); setEditIcon(role.icon); setEditColor(role.color) }} title="Edit">
                      <Edit2 size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-(--red) hover:text-(--red)" onClick={() => handleDelete(role.id)} title="Delete">
                      <Trash2 size={13} />
                    </Button>
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
