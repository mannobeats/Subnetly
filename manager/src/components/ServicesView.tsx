'use client'

import { useState, useEffect } from 'react'
import { Globe, Radio, Plus, Edit2, Trash2, Zap } from 'lucide-react'
import { Device } from '@/types'

interface ServiceData {
  id: string
  name: string
  protocol: string
  ports: string
  description?: string | null
  device: { id: string; name: string; ipAddress: string; category: string }
}

const protocolIcons: Record<string, React.ElementType> = {
  tcp: Globe,
  udp: Radio,
}

const emptyForm = { name: '', protocol: 'tcp', ports: '', description: '', deviceId: '' }

const ServicesView = ({ searchTerm }: { searchTerm: string }) => {
  const [services, setServices] = useState<ServiceData[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchData = () => {
    Promise.all([
      fetch('/api/services').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([svcData, devData]) => {
      setServices(svcData)
      setDevices(devData)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (s: ServiceData) => {
    setEditingId(s.id)
    setForm({ name: s.name, protocol: s.protocol, ports: s.ports, description: s.description || '', deviceId: s.device.id })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { name: form.name, protocol: form.protocol, ports: form.ports, description: form.description || null, deviceId: form.deviceId }
    const method = editingId ? 'PATCH' : 'POST'
    const url = editingId ? `/api/services/${editingId}` : '/api/services'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setModalOpen(false); fetchData() } else { alert('Failed to save service') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/services/${deleteTarget}`, { method: 'DELETE' })
    if (res.ok) { setDeleteModalOpen(false); setDeleteTarget(null); fetchData() }
  }

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.device?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ports.includes(searchTerm)
  )

  const grouped = filtered.reduce((acc: Record<string, { device: ServiceData['device']; services: ServiceData[] }>, s) => {
    if (!s.device) return acc
    if (!acc[s.device.id]) acc[s.device.id] = { device: s.device, services: [] }
    acc[s.device.id].services.push(s)
    return acc
  }, {})

  if (loading) return <div className="view-loading">Loading services...</div>

  return (
    <div className="services-view animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '12px', color: 'var(--unifi-text-muted)' }}>{services.length} service{services.length !== 1 ? 's' : ''} registered</span>
        <button className="btn btn-primary" onClick={openCreate} disabled={devices.length === 0}><Plus size={14} /> Add Service</button>
      </div>

      {services.length === 0 ? (
        <div className="empty-state">
          <Zap size={40} color="#cbd5e1" />
          <h3>No services registered</h3>
          <p>{devices.length === 0 ? 'Add devices first, then register services running on them.' : 'Register services running on your devices to track ports and protocols.'}</p>
          {devices.length > 0 && <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Service</button>}
        </div>
      ) : (
        <>
          <div className="services-device-grid">
            {Object.values(grouped).map(({ device, services: svcList }) => (
              <div key={device.id} className="services-device-card">
                <div className="services-device-header">
                  <div>
                    <div className="services-device-name">{device.name}</div>
                    <code className="services-device-ip">{device.ipAddress}</code>
                  </div>
                  <span className="badge badge-blue">{svcList.length} service{svcList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="services-list">
                  {svcList.map(s => {
                    const Icon = protocolIcons[s.protocol] || Globe
                    return (
                      <div key={s.id} className="services-item">
                        <div className="services-item-icon"><Icon size={14} /></div>
                        <div className="services-item-info">
                          <span className="services-item-name">{s.name}</span>
                          {s.description && <span className="services-item-desc">{s.description}</span>}
                        </div>
                        <code className="services-item-port">{s.protocol.toUpperCase()}:{s.ports}</code>
                        <div style={{ display: 'flex', gap: '2px', marginLeft: '0.5rem' }}>
                          <button className="btn" style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} onClick={() => openEdit(s)}><Edit2 size={10} /></button>
                          <button className="btn" style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => { setDeleteTarget(s.id); setDeleteModalOpen(true) }}><Trash2 size={10} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="dash-section" style={{ marginTop: '1.5rem' }}>
            <div className="dash-section-header">
              <h2>All Services</h2>
              <span className="dash-section-badge">{filtered.length} services</span>
            </div>
            <table className="unifi-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Service</th>
                  <th style={{ width: '100px' }}>Protocol</th>
                  <th style={{ width: '100px' }}>Port(s)</th>
                  <th style={{ width: '180px' }}>Device</th>
                  <th>Description</th>
                  <th style={{ width: '80px', textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td><span className="badge badge-blue">{s.protocol.toUpperCase()}</span></td>
                    <td><code style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px' }}>{s.ports}</code></td>
                    <td>{s.device?.name} <span style={{ color: '#94a3b8', fontSize: '11px' }}>({s.device?.ipAddress})</span></td>
                    <td style={{ color: 'var(--unifi-text-muted)' }}>{s.description || '—'}</td>
                    <td style={{ textAlign: 'right', paddingRight: '0.5rem' }}>
                      <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent' }} onClick={() => openEdit(s)}><Edit2 size={12} /></button>
                      <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => { setDeleteTarget(s.id); setDeleteModalOpen(true) }}><Trash2 size={12} /></button>
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
            <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>{editingId ? 'Edit Service' : 'Add Service'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Service Name</label>
                  <input required className="unifi-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. HTTP Proxy" />
                </div>
                <div className="input-group">
                  <label className="input-label">Device</label>
                  <select required className="unifi-input" value={form.deviceId} onChange={e => setForm({ ...form, deviceId: e.target.value })}>
                    <option value="">Select device...</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.ipAddress})</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Protocol</label>
                  <select className="unifi-input" value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}>
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Port(s)</label>
                  <input required className="unifi-input" value={form.ports} onChange={e => setForm({ ...form, ports: e.target.value })} placeholder="e.g. 80,443" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <input className="unifi-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Add Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ background: '#fee2e2', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#dc2626' }}><Trash2 size={24} /></div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '18px', fontWeight: 600 }}>Delete Service?</h2>
            <p style={{ color: 'var(--unifi-text-muted)', marginBottom: '2rem' }}>This will permanently remove this service.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
              <button className="btn btn-destructive" onClick={handleDelete}>Delete Service</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesView
