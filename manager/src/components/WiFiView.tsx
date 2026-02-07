'use client'

import { useState, useEffect, useMemo } from 'react'
import { Wifi, Plus, Edit2, Trash2, Shield, Eye, EyeOff, Radio, Signal, Lock, Unlock, Users } from 'lucide-react'

interface WifiVlan { id: string; vid: number; name: string; role?: string | null }
interface WifiSubnet { id: string; prefix: string; mask: number; description?: string | null; gateway?: string | null }

interface WifiData {
  id: string
  ssid: string
  security: string
  passphrase?: string | null
  band: string
  hidden: boolean
  enabled: boolean
  vlanId?: string | null
  vlan?: WifiVlan | null
  subnetId?: string | null
  subnet?: WifiSubnet | null
  guestNetwork: boolean
  clientIsolation: boolean
  bandSteering: boolean
  pmf: string
  txPower: string
  minRate?: number | null
  description?: string | null
}

const securityLabels: Record<string, string> = {
  'open': 'Open',
  'wpa2-personal': 'WPA2 Personal',
  'wpa3-personal': 'WPA3 Personal',
  'wpa2-enterprise': 'WPA2 Enterprise',
  'wpa3-enterprise': 'WPA3 Enterprise',
}

const bandLabels: Record<string, string> = {
  '2.4ghz': '2.4 GHz',
  '5ghz': '5 GHz',
  '6ghz': '6 GHz',
  'both': '2.4 + 5 GHz',
}

const securityColors: Record<string, string> = {
  'open': '#ef4444',
  'wpa2-personal': '#0055ff',
  'wpa3-personal': '#10b981',
  'wpa2-enterprise': '#7c3aed',
  'wpa3-enterprise': '#059669',
}

const emptyForm = {
  ssid: '', security: 'wpa2-personal', passphrase: '', band: 'both',
  hidden: false, enabled: true, vlanId: '', subnetId: '',
  guestNetwork: false, clientIsolation: false, bandSteering: true,
  pmf: 'optional', txPower: 'auto', minRate: '', description: '',
}

interface WiFiViewProps {
  searchTerm?: string
  selectedSecurityFilter?: string | null
}

const WiFiView = ({ searchTerm = '', selectedSecurityFilter = null }: WiFiViewProps) => {
  const [networks, setNetworks] = useState<WifiData[]>([])
  const [vlans, setVlans] = useState<WifiVlan[]>([])
  const [subnets, setSubnets] = useState<WifiSubnet[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassphrase, setShowPassphrase] = useState(false)

  const fetchData = () => {
    Promise.all([
      fetch('/api/wifi').then(r => r.json()),
      fetch('/api/vlans').then(r => r.json()),
      fetch('/api/subnets').then(r => r.json()),
    ]).then(([wifiData, vlanData, subnetData]) => {
      setNetworks(Array.isArray(wifiData) ? wifiData : [])
      setVlans(Array.isArray(vlanData) ? vlanData : [])
      setSubnets(Array.isArray(subnetData) ? subnetData : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) { setModalOpen(false); setEditingId(null); return }
        if (deleteModalOpen) { setDeleteModalOpen(false); return }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [modalOpen, deleteModalOpen])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowPassphrase(false)
    setModalOpen(true)
  }

  const openEdit = (n: WifiData) => {
    setEditingId(n.id)
    setForm({
      ssid: n.ssid,
      security: n.security,
      passphrase: n.passphrase || '',
      band: n.band,
      hidden: n.hidden,
      enabled: n.enabled,
      vlanId: n.vlanId || '',
      subnetId: n.subnetId || '',
      guestNetwork: n.guestNetwork,
      clientIsolation: n.clientIsolation,
      bandSteering: n.bandSteering,
      pmf: n.pmf,
      txPower: n.txPower,
      minRate: n.minRate ? String(n.minRate) : '',
      description: n.description || '',
    })
    setShowPassphrase(false)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ssid: form.ssid,
      security: form.security,
      passphrase: form.security === 'open' ? null : (form.passphrase || null),
      band: form.band,
      hidden: form.hidden,
      enabled: form.enabled,
      vlanId: form.vlanId || null,
      subnetId: form.subnetId || null,
      guestNetwork: form.guestNetwork,
      clientIsolation: form.clientIsolation,
      bandSteering: form.bandSteering,
      pmf: form.pmf,
      txPower: form.txPower,
      minRate: form.minRate ? parseInt(form.minRate) : null,
      description: form.description || null,
    }
    const method = editingId ? 'PATCH' : 'POST'
    const url = editingId ? `/api/wifi/${editingId}` : '/api/wifi'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setModalOpen(false); setEditingId(null); fetchData() } else { alert('Failed to save WiFi network') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/wifi/${deleteTarget}`, { method: 'DELETE' })
    if (res.ok) { setDeleteModalOpen(false); setDeleteTarget(null); fetchData() }
  }

  const handleToggleEnabled = async (n: WifiData) => {
    await fetch(`/api/wifi/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !n.enabled }),
    })
    fetchData()
  }

  const filtered = useMemo(() => {
    return networks.filter(n => {
      // Security filter from sidebar
      if (selectedSecurityFilter) {
        if (selectedSecurityFilter === 'wpa2' && !n.security.startsWith('wpa2')) return false
        if (selectedSecurityFilter === 'wpa3' && !n.security.startsWith('wpa3')) return false
        if (selectedSecurityFilter === 'open' && n.security !== 'open') return false
      }
      // Search filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return n.ssid.toLowerCase().includes(q) ||
          (n.description || '').toLowerCase().includes(q) ||
          n.security.toLowerCase().includes(q) ||
          (n.vlan?.name || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [networks, searchTerm, selectedSecurityFilter])

  const enabledCount = networks.filter(n => n.enabled).length
  const guestCount = networks.filter(n => n.guestNetwork).length

  if (loading) return <div className="view-loading">Loading WiFi networks...</div>

  return (
    <div className="wifi-view animate-fade-in">
      {/* Action button — above stats for consistency */}
      {networks.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Create WiFi Network</button>
        </div>
      )}

      {/* Stats */}
      <div className="dash-stat-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Total Networks</div>
          <div className="dash-stat-value" style={{ color: '#0055ff' }}>{networks.length}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Enabled</div>
          <div className="dash-stat-value" style={{ color: '#10b981' }}>{enabledCount}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Guest Networks</div>
          <div className="dash-stat-value" style={{ color: '#f59e0b' }}>{guestCount}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Disabled</div>
          <div className="dash-stat-value" style={{ color: '#94a3b8' }}>{networks.length - enabledCount}</div>
        </div>
      </div>

      {networks.length === 0 ? (
        <div className="empty-state">
          <Wifi size={40} color="#cbd5e1" />
          <h3>No WiFi networks configured</h3>
          <p>Create your first WiFi network to start managing wireless access.</p>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Create WiFi Network</button>
        </div>
      ) : (
        <>
          {/* WiFi Network Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {filtered.map(n => {
              const secColor = securityColors[n.security] || '#64748b'
              return (
                <div key={n.id} style={{
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  opacity: n.enabled ? 1 : 0.6,
                  position: 'relative',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: `${secColor}14`, color: secColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Wifi size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{n.ssid}</div>
                        <div style={{ fontSize: '11px', color: 'var(--unifi-text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                          <span className="badge" style={{ background: `${secColor}14`, color: secColor, fontSize: '9px', padding: '1px 6px' }}>
                            {n.security === 'open' ? <Unlock size={8} style={{ marginRight: '3px' }} /> : <Lock size={8} style={{ marginRight: '3px' }} />}
                            {securityLabels[n.security] || n.security}
                          </span>
                          <span style={{ fontSize: '10px' }}>{bandLabels[n.band] || n.band}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      <button
                        className="btn"
                        style={{ padding: '4px 6px', border: 'none', background: 'transparent', color: n.enabled ? '#10b981' : '#94a3b8' }}
                        onClick={() => handleToggleEnabled(n)}
                        title={n.enabled ? 'Disable' : 'Enable'}
                      >
                        <Radio size={14} />
                      </button>
                      <button className="btn" style={{ padding: '4px 6px', border: 'none', background: 'transparent' }} onClick={() => openEdit(n)} title="Edit"><Edit2 size={12} /></button>
                      <button className="btn" style={{ padding: '4px 6px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => { setDeleteTarget(n.id); setDeleteModalOpen(true) }} title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '0.75rem' }}>
                    <span className={`badge badge-${n.enabled ? 'green' : 'orange'}`} style={{ fontSize: '10px' }}>{n.enabled ? 'Enabled' : 'Disabled'}</span>
                    {n.guestNetwork && <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '10px' }}><Users size={8} style={{ marginRight: '2px' }} /> Guest</span>}
                    {n.hidden && <span className="badge" style={{ background: '#f1f3f5', color: '#64748b', fontSize: '10px' }}><EyeOff size={8} style={{ marginRight: '2px' }} /> Hidden</span>}
                    {n.clientIsolation && <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6', fontSize: '10px' }}><Shield size={8} style={{ marginRight: '2px' }} /> Isolated</span>}
                  </div>

                  {/* Network links */}
                  <div style={{ fontSize: '12px', color: 'var(--unifi-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {n.vlan && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>VLAN</span>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>VLAN {n.vlan.vid} — {n.vlan.name}</span>
                      </div>
                    )}
                    {n.subnet && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subnet</span>
                        <code style={{ fontSize: '11px', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px' }}>{n.subnet.prefix}/{n.subnet.mask}</code>
                      </div>
                    )}
                    {n.description && (
                      <div style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '11px' }}>{n.description}</div>
                    )}
                  </div>

                  {/* Advanced settings row */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '3px' }}>
                      <Signal size={8} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                      TX: {n.txPower}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '3px' }}>
                      PMF: {n.pmf}
                    </span>
                    {n.bandSteering && (
                      <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '3px' }}>
                        Band Steering
                      </span>
                    )}
                    {n.minRate && (
                      <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '3px' }}>
                        Min: {n.minRate} Mbps
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Table view */}
          <div className="dash-section">
            <div className="dash-section-header">
              <h2>All WiFi Networks</h2>
              <span className="dash-section-badge">{filtered.length} networks</span>
            </div>
            <table className="unifi-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>SSID</th>
                  <th style={{ width: '140px' }}>Security</th>
                  <th style={{ width: '100px' }}>Band</th>
                  <th style={{ width: '140px' }}>VLAN</th>
                  <th style={{ width: '140px' }}>Subnet</th>
                  <th style={{ width: '80px' }}>Status</th>
                  <th>Features</th>
                  <th style={{ width: '80px', textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id} style={{ opacity: n.enabled ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wifi size={13} color={securityColors[n.security] || '#64748b'} />
                        {n.ssid}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${securityColors[n.security] || '#64748b'}14`, color: securityColors[n.security] || '#64748b' }}>
                        {securityLabels[n.security] || n.security}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{bandLabels[n.band] || n.band}</td>
                    <td>{n.vlan ? `VLAN ${n.vlan.vid}` : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td>{n.subnet ? <code style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px' }}>{n.subnet.prefix}/{n.subnet.mask}</code> : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td><span className={`badge badge-${n.enabled ? 'green' : 'orange'}`}>{n.enabled ? 'active' : 'disabled'}</span></td>
                    <td style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {[n.guestNetwork && 'Guest', n.hidden && 'Hidden', n.clientIsolation && 'Isolated', n.bandSteering && 'Band Steering'].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '0.5rem' }}>
                      <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent' }} onClick={() => openEdit(n)}><Edit2 size={12} /></button>
                      <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => { setDeleteTarget(n.id); setDeleteModalOpen(true) }}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => { setModalOpen(false); setEditingId(null) }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>{editingId ? 'Edit WiFi Network' : 'Create WiFi Network'}</h2>
            <form onSubmit={handleSubmit}>
              {/* SSID + Security */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">SSID (Network Name)</label>
                  <input required className="unifi-input" value={form.ssid} onChange={e => setForm({ ...form, ssid: e.target.value })} placeholder="e.g. HomeNetwork" />
                </div>
                <div className="input-group">
                  <label className="input-label">Security</label>
                  <select className="unifi-input" value={form.security} onChange={e => setForm({ ...form, security: e.target.value })}>
                    <option value="wpa2-personal">WPA2 Personal</option>
                    <option value="wpa3-personal">WPA3 Personal</option>
                    <option value="wpa2-enterprise">WPA2 Enterprise</option>
                    <option value="wpa3-enterprise">WPA3 Enterprise</option>
                    <option value="open">Open (No Security)</option>
                  </select>
                </div>
              </div>

              {/* Passphrase */}
              {form.security !== 'open' && (
                <div className="input-group">
                  <label className="input-label">Passphrase</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      className="unifi-input"
                      style={{ paddingRight: '2.5rem' }}
                      value={form.passphrase}
                      onChange={e => setForm({ ...form, passphrase: e.target.value })}
                      placeholder="WiFi password"
                      minLength={8}
                    />
                    <button
                      type="button"
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                      onClick={() => setShowPassphrase(!showPassphrase)}
                    >
                      {showPassphrase ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Band + VLAN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Band</label>
                  <select className="unifi-input" value={form.band} onChange={e => setForm({ ...form, band: e.target.value })}>
                    <option value="both">2.4 GHz + 5 GHz</option>
                    <option value="2.4ghz">2.4 GHz Only</option>
                    <option value="5ghz">5 GHz Only</option>
                    <option value="6ghz">6 GHz Only</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">VLAN</label>
                  <select className="unifi-input" value={form.vlanId} onChange={e => setForm({ ...form, vlanId: e.target.value })}>
                    <option value="">None (Default)</option>
                    {vlans.map(v => <option key={v.id} value={v.id}>VLAN {v.vid} — {v.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Subnet + Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Subnet</label>
                  <select className="unifi-input" value={form.subnetId} onChange={e => setForm({ ...form, subnetId: e.target.value })}>
                    <option value="">Auto / None</option>
                    {subnets.map(s => <option key={s.id} value={s.id}>{s.prefix}/{s.mask} {s.description ? `— ${s.description}` : ''}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <input className="unifi-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                </div>
              </div>

              {/* Toggle switches */}
              <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
                  <span>Enabled</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.guestNetwork} onChange={e => setForm({ ...form, guestNetwork: e.target.checked })} />
                  <span>Guest Network</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.hidden} onChange={e => setForm({ ...form, hidden: e.target.checked })} />
                  <span>Hidden SSID</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.clientIsolation} onChange={e => setForm({ ...form, clientIsolation: e.target.checked })} />
                  <span>Client Isolation</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.bandSteering} onChange={e => setForm({ ...form, bandSteering: e.target.checked })} />
                  <span>Band Steering</span>
                </label>
              </div>

              {/* Advanced */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginTop: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">PMF</label>
                  <select className="unifi-input" value={form.pmf} onChange={e => setForm({ ...form, pmf: e.target.value })}>
                    <option value="disabled">Disabled</option>
                    <option value="optional">Optional</option>
                    <option value="required">Required</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">TX Power</label>
                  <select className="unifi-input" value={form.txPower} onChange={e => setForm({ ...form, txPower: e.target.value })}>
                    <option value="auto">Auto</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Min Rate (Mbps)</label>
                  <input type="number" className="unifi-input" value={form.minRate} onChange={e => setForm({ ...form, minRate: e.target.value })} placeholder="Auto" min="1" max="54" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => { setModalOpen(false); setEditingId(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Network'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ width: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#fee2e2', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#dc2626' }}>
              <Trash2 size={24} />
            </div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '18px', fontWeight: 600 }}>Delete WiFi Network?</h2>
            <p style={{ color: 'var(--unifi-text-muted)', marginBottom: '2rem' }}>This will permanently remove this wireless network configuration.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
              <button className="btn btn-destructive" onClick={handleDelete}>Delete Network</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WiFiView
