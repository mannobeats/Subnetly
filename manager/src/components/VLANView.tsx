'use client'

import { useState, useEffect } from 'react'
import { Network, Plus, Shield, Wifi, Server, Laptop } from 'lucide-react'

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

const VLANView = () => {
  const [vlans, setVlans] = useState<VLANData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vlans')
      .then(r => r.json())
      .then(setVlans)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="view-loading">Loading VLANs...</div>

  return (
    <div className="vlan-view animate-fade-in">
      <div className="vlan-grid">
        {vlans.map(v => {
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
                  <span className={`badge badge-${v.status === 'active' ? 'green' : 'orange'}`}>{v.status}</span>
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
                  {v.role && (
                    <span className="badge" style={{ background: `${color}14`, color }}>{v.role}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* VLAN Matrix */}
      <div className="dash-section" style={{ marginTop: '1.5rem' }}>
        <div className="dash-section-header">
          <h2>VLAN Overview</h2>
        </div>
        <table className="unifi-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>VID</th>
              <th style={{ width: '150px' }}>Name</th>
              <th style={{ width: '120px' }}>Role</th>
              <th style={{ width: '100px' }}>Status</th>
              <th>Subnets</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {vlans.map(v => (
              <tr key={v.id}>
                <td><code style={{ fontSize: '12px', fontWeight: 600, color: roleColors[v.role || ''] || '#64748b' }}>{v.vid}</code></td>
                <td style={{ fontWeight: 500 }}>{v.name}</td>
                <td><span className="badge" style={{ background: `${roleColors[v.role || ''] || '#64748b'}14`, color: roleColors[v.role || ''] || '#64748b' }}>{v.role || '—'}</span></td>
                <td><span className={`badge badge-${v.status === 'active' ? 'green' : 'orange'}`}>{v.status}</span></td>
                <td>{v.subnets.map(s => <code key={s.id} style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px', marginRight: '4px' }}>{s.prefix}/{s.mask}</code>)}</td>
                <td style={{ color: 'var(--unifi-text-muted)' }}>{v.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default VLANView
