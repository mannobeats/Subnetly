'use client'

import { useState, useEffect, useMemo } from 'react'
import { Network, Plus, Shield, Wifi, Server, Laptop, Edit2, Trash2 } from 'lucide-react'

interface VLANData {
  id: string
  vid: number
  name: string
  status: string
  role?: string | null
  description?: string | null
  subnets: { id: string; prefix: string; mask: number; description?: string | null; gateway?: string | null }[]
}

const roleColors: Record<string, string> = {
  management: '#0055ff',
  production: '#10b981',
  iot: '#f97316',
  guest: '#8b5cf6',
}

const roleIcons: Record<string, React.ElementType> = {
  management: Shield,
  production: Server,
  iot: Laptop,
  guest: Wifi,
}

interface VLANViewProps {
  searchTerm?: string
  selectedRole?: string | null
}

const emptyForm = { vid: '', name: '', status: 'active', role: '', description: '' }

const VLANView = ({ searchTerm = '', selectedRole = null }: VLANViewProps) => {
  const [vlans, setVlans] = useState<VLANData[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchVlans = () => {
    fetch('/api/vlans')
      .then(r => r.json())
      .then(setVlans)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchVlans() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (v: VLANData) => {
    setEditingId(v.id)
    setForm({ vid: String(v.vid), name: v.name, status: v.status, role: v.role || '', description: v.description || '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { vid: parseInt(form.vid), name: form.name, status: form.status, role: form.role || null, description: form.description || null }
    const method = editingId ? 'PATCH' : 'POST'
    const url = editingId ? `/api/vlans/${editingId}` : '/api/vlans'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setModalOpen(false); fetchVlans() } else { alert('Failed to save VLAN') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/vlans/${deleteTarget}`, { method: 'DELETE' })
    if (res.ok) { setDeleteModalOpen(false); setDeleteTarget(null); fetchVlans() }
  }

  const filteredVlans = useMemo(() => {
    return vlans.filter(v => {
      const matchesRole = selectedRole ? v.role === selectedRole : true
      const matchesSearch = !searchTerm || 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(v.vid).includes(searchTerm) ||
        (v.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.subnets.some(s => s.prefix.includes(searchTerm))
      return matchesRole && matchesSearch
    })
  }, [vlans, selectedRole, searchTerm])

  if (loading) return <div className="view-loading">Loading VLANs...</div>

  return (
    <div className="vlan-view animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '12px', color: 'var(--unifi-text-muted)' }}>{vlans.length} VLAN{vlans.length !== 1 ? 's' : ''} configured</span>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add VLAN</button>
      </div>

      {vlans.length === 0 ? (
        <div className="empty-state">
          <Network size={40} color="#cbd5e1" />
          <h3>No VLANs configured</h3>
          <p>Create your first VLAN to start segmenting your network.</p>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Create VLAN</button>
        </div>
      ) : (
        <>
          <div className="vlan-grid">
            {filteredVlans.map(v => {
              const color = roleColors[v.role || ''] || '#64748b'
              const Icon = roleIcons[v.role || ''] || Network
              return (
                <div key={v.id} className="vlan-card">
                  <div className="vlan-card-header">
                    <div className="vlan-card-icon" style={{ background: `${color}14`, color }}>
                      <Icon size={20} />
                    </div>
                    <div className="vlan-card-title">
                      <div className="vlan-card-name">
                        <span className="vlan-vid">VLAN {v.vid}</span>
                        <span className="vlan-name">{v.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn" style={{ padding: '4px 6px', border: 'none', background: 'transparent' }} onClick={() => openEdit(v)} title="Edit"><Edit2 size={12} /></button>
                        <button className="btn" style={{ padding: '4px 6px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => { setDeleteTarget(v.id); setDeleteModalOpen(true) }} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                  {v.description && <p className="vlan-card-desc">{v.description}</p>}
                  <div className="vlan-card-role">
                    <span className="vlan-role-label">Role</span>
                    <span className="vlan-role-value" style={{ color }}>{v.role || 'Unassigned'}</span>
                  </div>
                  {v.subnets.length > 0 && (
                    <div className="vlan-subnets">
                      <span className="vlan-subnets-label">Associated Subnets</span>
                      {v.subnets.map(s => (
                        <div key={s.id} className="vlan-subnet-row">
                          <code className="vlan-subnet-prefix">{s.prefix}/{s.mask}</code>
                          {s.gateway && <span className="vlan-subnet-gw">GW: {s.gateway}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="vlan-card-footer">
                    <div className="vlan-tag-row">
                      <span className="badge badge-blue">{v.subnets.length} subnet{v.subnets.length !== 1 ? 's' : ''}</span>
                      {v.role && <span className="badge" style={{ background: `${color}14`, color }}>{v.role}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="dash-section" style={{ marginTop: '1.5rem' }}>
            <div className="dash-section-header"><h2>VLAN Overview</h2></div>
            <table className="unifi-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>VID</th>
                  <th style={{ width: '150px' }}>Name</th>
                  <th style={{ width: '120px' }}>Role</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th>Subnets</th>
                  <th>Description</th>
                  <th style={{ width: '80px', textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVlans.map(v => (
                  <tr key={v.id}>
                    <td><code style={{ fontSize: '12px', fontWeight: 600, color: roleColors[v.role || ''] || '#64748b' }}>{v.vid}</code></td>
                    <td style={{ fontWeight: 500 }}>{v.name}</td>
                    <td><span className="badge" style={{ background: `${roleColors[v.role || ''] || '#64748b'}14`, color: roleColors[v.role || ''] || '#64748b' }}>{v.role || '—'}</span></td>
                    <td><span className={`badge badge-${v.status === 'active' ? 'green' : 'orange'}`}>{v.status}</span></td>
                    <td>{v.subnets.map(s => <code key={s.id} style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px', marginRight: '4px' }}>{s.prefix}/{s.mask}</code>)}</td>
                    <td style={{ color: 'var(--unifi-text-muted)' }}>{v.description || '—'}</td>
                    <td style={{ textAlign: 'right', paddingRight: '0.5rem' }}>
                      <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent' }} onClick={() => openEdit(v)}><Edit2 size={12} /></button>
                      <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => { setDeleteTarget(v.id); setDeleteModalOpen(true) }}><Trash2 size={12} /></button>
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
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>{editingId ? 'Edit VLAN' : 'Create VLAN'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">VLAN ID (VID)</label>
                  <input required type="number" min="1" max="4094" className="unifi-input" value={form.vid} onChange={e => setForm({ ...form, vid: e.target.value })} placeholder="e.g. 10" />
                </div>
                <div className="input-group">
                  <label className="input-label">Name</label>
                  <input required className="unifi-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Management" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select className="unifi-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="">None</option>
                    <option value="management">Management</option>
                    <option value="production">Production</option>
                    <option value="iot">IoT</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select className="unifi-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="reserved">Reserved</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <input className="unifi-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create VLAN'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ background: '#fee2e2', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#dc2626' }}>
              <Trash2 size={24} />
            </div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '18px', fontWeight: 600 }}>Delete VLAN?</h2>
            <p style={{ color: 'var(--unifi-text-muted)', marginBottom: '2rem' }}>This will remove the VLAN. Associated subnets will be unlinked.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
              <button className="btn btn-destructive" onClick={handleDelete}>Delete VLAN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VLANView
