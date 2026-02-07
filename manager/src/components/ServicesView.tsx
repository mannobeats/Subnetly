'use client'

import { useState, useEffect } from 'react'
import { Globe, Radio, Plus, Edit2, Trash2, Zap, AlertTriangle, ExternalLink, Container, Server, Activity, RefreshCw } from 'lucide-react'
import { Device } from '@/types'

interface ServiceData {
  id: string
  name: string
  protocol: string
  ports: string
  description?: string | null
  device: { id: string; name: string; ipAddress: string; category: string }
  url?: string | null
  environment?: string | null
  isDocker?: boolean
  dockerImage?: string | null
  dockerCompose?: boolean
  stackName?: string | null
  healthStatus?: string | null
  version?: string | null
  dependencies?: string | null
  tags?: string | null
  healthCheckEnabled?: boolean
  lastCheckedAt?: string | null
  lastResponseTime?: number | null
  uptimePercent?: number | null
  checkCount?: number
  successCount?: number
}

const protocolIcons: Record<string, React.ElementType> = { tcp: Globe, udp: Radio }

const envColors: Record<string, { bg: string; color: string }> = {
  production: { bg: '#dcfce7', color: '#166534' },
  staging: { bg: '#fef3c7', color: '#92400e' },
  development: { bg: '#dbeafe', color: '#1e40af' },
  testing: { bg: '#ede9fe', color: '#5b21b6' },
}

const healthColors: Record<string, { bg: string; color: string; dot: string }> = {
  healthy: { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  degraded: { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  down: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  unknown: { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
}

const emptyForm = {
  name: '', protocol: 'tcp', ports: '', description: '', deviceId: '',
  url: '', environment: 'production', isDocker: false, dockerImage: '',
  dockerCompose: false, stackName: '', healthStatus: 'unknown', version: '',
  dependencies: '', tags: '', healthCheckEnabled: false,
}

const ServicesView = ({ searchTerm, selectedProtocol = null }: { searchTerm: string; selectedProtocol?: string | null }) => {
  const [services, setServices] = useState<ServiceData[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [healthChecking, setHealthChecking] = useState(false)

  const fetchData = () => {
    Promise.all([
      fetch('/api/services').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([svcData, devData]) => {
      setServices(Array.isArray(svcData) ? svcData : [])
      setDevices(Array.isArray(devData) ? devData : [])
    }).finally(() => setLoading(false))
  }

  const runHealthCheck = async () => {
    setHealthChecking(true)
    try {
      await fetch('/api/health-check', { method: 'POST' })
      fetchData()
    } finally {
      setHealthChecking(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Auto health check timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    const startAutoCheck = async () => {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const settings = await res.json()
        if (settings.healthCheckEnabled && settings.healthCheckInterval > 0) {
          // Run immediately on mount
          fetch('/api/health-check', { method: 'POST' }).then(() => fetchData())
          // Then set interval
          timer = setInterval(async () => {
            await fetch('/api/health-check', { method: 'POST' })
            fetchData()
          }, settings.healthCheckInterval * 1000)
        }
      } catch { /* settings not configured yet */ }
    }
    startAutoCheck()
    return () => { if (timer) clearInterval(timer) }
  }, [])

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

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (s: ServiceData) => {
    setEditingId(s.id)
    setForm({
      name: s.name, protocol: s.protocol, ports: s.ports,
      description: s.description || '', deviceId: s.device.id,
      url: s.url || '', environment: s.environment || 'production',
      isDocker: s.isDocker || false, dockerImage: s.dockerImage || '',
      dockerCompose: s.dockerCompose || false, stackName: s.stackName || '',
      healthStatus: s.healthStatus || 'unknown', version: s.version || '',
      dependencies: s.dependencies || '', tags: s.tags || '',
      healthCheckEnabled: s.healthCheckEnabled || false,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name, protocol: form.protocol, ports: form.ports,
      description: form.description || null, deviceId: form.deviceId,
      url: form.url || null, environment: form.environment,
      isDocker: form.isDocker, dockerImage: form.isDocker ? (form.dockerImage || null) : null,
      dockerCompose: form.isDocker ? form.dockerCompose : false,
      stackName: form.isDocker && form.dockerCompose ? (form.stackName || null) : null,
      healthStatus: form.healthStatus, version: form.version || null,
      dependencies: form.dependencies || null, tags: form.tags || null,
      healthCheckEnabled: form.healthCheckEnabled,
    }
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

  const handleHealthToggle = async (s: ServiceData, newStatus: string) => {
    await fetch(`/api/services/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthStatus: newStatus }),
    })
    fetchData()
  }

  const filtered = services.filter(s => {
    const matchesSearch = !searchTerm ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.device?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ports.includes(searchTerm) ||
      (s.dockerImage || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.tags || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.stackName || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProtocol = !selectedProtocol || s.protocol === selectedProtocol
    return matchesSearch && matchesProtocol
  })

  const tcpCount = services.filter(s => s.protocol === 'tcp').length
  const udpCount = services.filter(s => s.protocol === 'udp').length
  const dockerCount = services.filter(s => s.isDocker).length
  const healthyCount = services.filter(s => s.healthStatus === 'healthy').length
  const uniqueDevices = new Set(services.map(s => s.device?.id)).size
  const uniquePorts = new Set(services.flatMap(s => s.ports.split(',').map(p => p.trim()))).size

  // Build dependency graph
  const dependencyEdges: { from: string; to: string; fromName: string; toName: string }[] = []
  services.forEach(s => {
    if (s.dependencies) {
      s.dependencies.split(',').map(d => d.trim()).filter(Boolean).forEach(depName => {
        const target = services.find(t => t.name.toLowerCase() === depName.toLowerCase())
        if (target) {
          dependencyEdges.push({ from: s.id, to: target.id, fromName: s.name, toName: target.name })
        }
      })
    }
  })

  const grouped = filtered.reduce((acc: Record<string, { device: ServiceData['device']; services: ServiceData[] }>, s) => {
    if (!s.device) return acc
    if (!acc[s.device.id]) acc[s.device.id] = { device: s.device, services: [] }
    acc[s.device.id].services.push(s)
    return acc
  }, {})

  // Port conflict detection
  const portConflicts: { deviceName: string; port: string; protocol: string; services: string[] }[] = []
  const byDevice: Record<string, ServiceData[]> = {}
  services.forEach(s => { if (s.device) { if (!byDevice[s.device.id]) byDevice[s.device.id] = []; byDevice[s.device.id].push(s) } })
  Object.values(byDevice).forEach(svcList => {
    const portMap: Record<string, string[]> = {}
    svcList.forEach(s => {
      s.ports.split(',').map(p => p.trim()).forEach(port => {
        const key = `${s.protocol}:${port}`
        if (!portMap[key]) portMap[key] = []
        portMap[key].push(s.name)
      })
    })
    Object.entries(portMap).forEach(([key, names]) => {
      if (names.length > 1) {
        const [protocol, port] = key.split(':')
        portConflicts.push({ deviceName: svcList[0].device.name, port, protocol, services: names })
      }
    })
  })

  // Docker stack grouping
  const stacks = services.filter(s => s.isDocker && s.stackName).reduce((acc: Record<string, ServiceData[]>, s) => {
    const key = s.stackName!
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  if (loading) return <div className="view-loading">Loading services...</div>

  return (
    <div className="services-view animate-fade-in">
      {/* Action buttons */}
      {services.length > 0 && devices.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className="btn" onClick={runHealthCheck} disabled={healthChecking} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <RefreshCw size={14} className={healthChecking ? 'spin' : ''} /> {healthChecking ? 'Checking...' : 'Run Health Check'}
          </button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Service</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="dash-stat-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Total Services</div>
          <div className="dash-stat-value" style={{ color: '#0055ff' }}>{services.length}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Healthy</div>
          <div className="dash-stat-value" style={{ color: '#10b981' }}>{healthyCount}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Docker</div>
          <div className="dash-stat-value" style={{ color: '#2563eb' }}>{dockerCount}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">TCP / UDP</div>
          <div className="dash-stat-value" style={{ color: '#7c3aed' }}>{tcpCount} / {udpCount}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Devices</div>
          <div className="dash-stat-value" style={{ color: '#f97316' }}>{uniqueDevices}</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">Unique Ports</div>
          <div className="dash-stat-value" style={{ color: '#06b6d4' }}>{uniquePorts}</div>
        </div>
      </div>

      {/* Port Conflict Warnings */}
      {portConflicts.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={16} color="#dc2626" />
            <span style={{ fontWeight: 600, fontSize: '13px', color: '#dc2626' }}>Port Conflicts Detected ({portConflicts.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {portConflicts.map((c, i) => (
              <div key={i} style={{ fontSize: '12px', color: '#991b1b', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <code style={{ background: '#fee2e2', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>{c.protocol.toUpperCase()}:{c.port}</code>
                <span>on <strong>{c.deviceName}</strong> — used by: {c.services.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Map */}
      {dependencyEdges.length > 0 && (
        <div className="dash-section" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-section-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={16} /> Service Dependencies</h2>
            <span className="dash-section-badge">{dependencyEdges.length} connections</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem' }}>
            {dependencyEdges.map((edge, i) => {
              const fromSvc = services.find(s => s.id === edge.from)
              const toSvc = services.find(s => s.id === edge.to)
              const fromHealth = healthColors[fromSvc?.healthStatus || 'unknown']
              const toHealth = healthColors[toSvc?.healthStatus || 'unknown']
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: fromHealth.dot }} />
                    <span style={{ fontWeight: 600 }}>{edge.fromName}</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>depends on</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: toHealth.dot }} />
                    <span style={{ fontWeight: 600 }}>{edge.toName}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <div className="empty-state">
          <Zap size={40} color="#cbd5e1" />
          <h3>No services registered</h3>
          <p>{devices.length === 0 ? 'Add devices first, then register services running on them.' : 'Register services running on your devices to track ports and protocols.'}</p>
          {devices.length > 0 && <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Service</button>}
        </div>
      ) : (
        <>
          {/* Docker Stacks */}
          {Object.keys(stacks).length > 0 && (
            <div className="dash-section" style={{ marginBottom: '1.5rem' }}>
              <div className="dash-section-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Container size={16} /> Docker Stacks</h2>
                <span className="dash-section-badge">{Object.keys(stacks).length} stacks</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                {Object.entries(stacks).map(([stackName, stackServices]) => (
                  <div key={stackName} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Container size={16} color="#2563eb" />
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{stackName}</span>
                      </div>
                      <span className="badge badge-blue" style={{ fontSize: '9px' }}>{stackServices.length} containers</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {stackServices.map(s => {
                        const hc = healthColors[s.healthStatus || 'unknown']
                        return (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 6px', borderRadius: '6px', background: '#f8fafc', fontSize: '12px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: hc.dot, flexShrink: 0 }} />
                            <span style={{ fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            {s.dockerImage && <code style={{ fontSize: '9px', color: '#64748b', background: '#e2e8f0', padding: '1px 4px', borderRadius: '3px' }}>{s.dockerImage.split('/').pop()}</code>}
                            <code style={{ fontSize: '10px', color: '#94a3b8' }}>:{s.ports}</code>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Cards by Device */}
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
                    const hc = healthColors[s.healthStatus || 'unknown']
                    const ec = envColors[s.environment || 'production'] || envColors.production
                    return (
                      <div key={s.id} className="services-item" style={{ flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: hc.dot, flexShrink: 0 }} title={s.healthStatus || 'unknown'} />
                          <div className="services-item-icon"><Icon size={14} /></div>
                          <div className="services-item-info" style={{ flex: 1, minWidth: 0 }}>
                            <span className="services-item-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {s.name}
                              {s.version && <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 400 }}>v{s.version}</span>}
                            </span>
                            {s.description && <span className="services-item-desc">{s.description}</span>}
                          </div>
                          <code className="services-item-port">{s.protocol.toUpperCase()}:{s.ports}</code>
                          <div style={{ display: 'flex', gap: '2px', marginLeft: '0.25rem' }}>
                            {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: '#0055ff' }} title="Open URL"><ExternalLink size={10} /></a>}
                            <button className="btn" style={{ padding: '2px 4px', border: 'none', background: 'transparent' }} onClick={() => openEdit(s)}><Edit2 size={10} /></button>
                            <button className="btn" style={{ padding: '2px 4px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => { setDeleteTarget(s.id); setDeleteModalOpen(true) }}><Trash2 size={10} /></button>
                          </div>
                        </div>
                        {/* Tags row */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px', paddingLeft: '2rem' }}>
                          {s.isDocker && <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '8px', padding: '1px 5px' }}>Docker</span>}
                          {s.dockerImage && <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '8px', padding: '1px 5px' }}>{s.dockerImage.length > 25 ? s.dockerImage.slice(0, 25) + '…' : s.dockerImage}</span>}
                          <span className="badge" style={{ background: ec.bg, color: ec.color, fontSize: '8px', padding: '1px 5px' }}>{s.environment || 'production'}</span>
                          {s.tags && s.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                            <span key={t} className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '8px', padding: '1px 5px' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Full Table */}
          <div className="dash-section" style={{ marginTop: '1.5rem' }}>
            <div className="dash-section-header">
              <h2>All Services</h2>
              <span className="dash-section-badge">{filtered.length} services</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="unifi-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}></th>
                    <th>Service</th>
                    <th style={{ width: '80px' }}>Protocol</th>
                    <th style={{ width: '80px' }}>Port(s)</th>
                    <th>Device</th>
                    <th style={{ width: '110px' }}>Env</th>
                    <th style={{ width: '120px' }}>Health</th>
                    <th style={{ width: '90px' }}>Uptime</th>
                    <th style={{ width: '100px' }}>Type</th>
                    <th>Description</th>
                    <th style={{ width: '70px', textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const hc = healthColors[s.healthStatus || 'unknown']
                    const ec = envColors[s.environment || 'production'] || envColors.production
                    return (
                      <tr key={s.id}>
                        <td><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: hc.dot }} title={s.healthStatus || 'unknown'} /></td>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {s.name}
                            {s.version && <span style={{ fontSize: '9px', color: '#94a3b8' }}>v{s.version}</span>}
                            {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0055ff', display: 'inline-flex' }}><ExternalLink size={10} /></a>}
                          </div>
                        </td>
                        <td><span className="badge badge-blue">{s.protocol.toUpperCase()}</span></td>
                        <td><code style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px' }}>{s.ports}</code></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Server size={11} color="#0055ff" />
                            <span style={{ fontSize: '12px' }}>{s.device?.name}</span>
                          </div>
                        </td>
                        <td style={{ overflow: 'visible' }}><span className="badge" style={{ background: ec.bg, color: ec.color, fontSize: '9px', whiteSpace: 'nowrap' }}>{s.environment || 'production'}</span></td>
                        <td style={{ overflow: 'visible' }}>
                          <select
                            value={s.healthStatus || 'unknown'}
                            onChange={e => handleHealthToggle(s, e.target.value)}
                            style={{ fontSize: '10px', padding: '2px 6px', border: `1px solid ${hc.dot}`, borderRadius: '4px', background: hc.bg, color: hc.color, cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap', width: '100%' }}
                          >
                            <option value="healthy">Healthy</option>
                            <option value="degraded">Degraded</option>
                            <option value="down">Down</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </td>
                        <td style={{ overflow: 'visible' }}>
                          {s.healthCheckEnabled ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Activity size={10} color={s.uptimePercent != null && s.uptimePercent >= 99 ? '#22c55e' : s.uptimePercent != null && s.uptimePercent >= 90 ? '#f59e0b' : '#ef4444'} />
                                <span style={{ fontSize: '11px', fontWeight: 600 }}>{s.uptimePercent != null ? `${s.uptimePercent}%` : '—'}</span>
                              </div>
                              {s.lastResponseTime != null && (
                                <span style={{ fontSize: '9px', color: '#94a3b8' }}>{s.lastResponseTime}ms</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td>
                          {s.isDocker ? (
                            <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '9px' }}>
                              Docker{s.stackName ? ` · ${s.stackName}` : ''}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Native</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--unifi-text-muted)', fontSize: '12px' }}>{s.description || '—'}</td>
                        <td style={{ textAlign: 'right', paddingRight: '0.5rem' }}>
                          <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent' }} onClick={() => openEdit(s)}><Edit2 size={12} /></button>
                          <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => { setDeleteTarget(s.id); setDeleteModalOpen(true) }}><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => { setModalOpen(false); setEditingId(null) }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>{editingId ? 'Edit Service' : 'Add Service'}</h2>
            <form onSubmit={handleSubmit}>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Service Name</label>
                  <input required className="unifi-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nginx Proxy" />
                </div>
                <div className="input-group">
                  <label className="input-label">Device</label>
                  <select required className="unifi-input" value={form.deviceId} onChange={e => setForm({ ...form, deviceId: e.target.value })}>
                    <option value="">Select device...</option>
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.ipAddress})</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Protocol</label>
                  <select className="unifi-input" value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}>
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Port(s)</label>
                  <input required className="unifi-input" value={form.ports} onChange={e => setForm({ ...form, ports: e.target.value })} placeholder="80,443" />
                </div>
                <div className="input-group">
                  <label className="input-label">Version</label>
                  <input className="unifi-input" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="e.g. 2.19.0" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Access URL</label>
                  <input className="unifi-input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://service.local:8080" />
                </div>
                <div className="input-group">
                  <label className="input-label">Environment</label>
                  <select className="unifi-input" value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value })}>
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                    <option value="testing">Testing</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Health Status</label>
                  <select className="unifi-input" value={form.healthStatus} onChange={e => setForm({ ...form, healthStatus: e.target.value })}>
                    <option value="healthy">Healthy</option>
                    <option value="degraded">Degraded</option>
                    <option value="down">Down</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Tags (comma-separated)</label>
                  <input className="unifi-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="web, proxy, critical" />
                </div>
              </div>

              {/* Docker Section */}
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginBottom: form.isDocker ? '1rem' : 0 }}>
                  <input type="checkbox" checked={form.isDocker} onChange={e => setForm({ ...form, isDocker: e.target.checked })} style={{ accentColor: '#2563eb' }} />
                  <Container size={14} color="#2563eb" /> Running in Docker
                </label>
                {form.isDocker && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="input-group">
                      <label className="input-label">Docker Image</label>
                      <input className="unifi-input" value={form.dockerImage} onChange={e => setForm({ ...form, dockerImage: e.target.value })} placeholder="nginx:latest" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Stack Name</label>
                      <input className="unifi-input" value={form.stackName} onChange={e => setForm({ ...form, stackName: e.target.value })} placeholder="e.g. media-stack" />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '12px', gridColumn: 'span 2' }}>
                      <input type="checkbox" checked={form.dockerCompose} onChange={e => setForm({ ...form, dockerCompose: e.target.checked })} style={{ accentColor: '#2563eb' }} />
                      Part of Docker Compose stack
                    </label>
                  </div>
                )}
              </div>

              {/* Health Check Section */}
              {form.url && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <input type="checkbox" checked={form.healthCheckEnabled} onChange={e => setForm({ ...form, healthCheckEnabled: e.target.checked })} style={{ accentColor: '#22c55e' }} />
                    <Activity size={14} color="#22c55e" /> Enable Auto Health Check
                  </label>
                  {form.healthCheckEnabled && (
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
                      This service&apos;s URL will be automatically pinged at the interval configured in Settings. Health status will update to healthy, degraded, or down based on response.
                    </p>
                  )}
                </div>
              )}

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label className="input-label">Dependencies (comma-separated service names)</label>
                <input className="unifi-input" value={form.dependencies} onChange={e => setForm({ ...form, dependencies: e.target.value })} placeholder="e.g. PostgreSQL, Redis" />
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
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ width: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
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
