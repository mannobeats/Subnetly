'use client'

import { useState, useEffect } from 'react'
import { Globe, Lock, Shield, Radio } from 'lucide-react'

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
  https: Lock,
}

const ServicesView = ({ searchTerm }: { searchTerm: string }) => {
  const [services, setServices] = useState<ServiceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(setServices)
      .finally(() => setLoading(false))
  }, [])

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ports.includes(searchTerm)
  )

  // Group by device
  const grouped = filtered.reduce((acc: Record<string, { device: ServiceData['device']; services: ServiceData[] }>, s) => {
    if (!acc[s.device.id]) acc[s.device.id] = { device: s.device, services: [] }
    acc[s.device.id].services.push(s)
    return acc
  }, {})

  if (loading) return <div className="view-loading">Loading services...</div>

  return (
    <div className="services-view animate-fade-in">
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
                return (
                  <div key={s.id} className="services-item">
                    <div className="services-item-icon">
                      <Icon size={14} />
                    </div>
                    <div className="services-item-info">
                      <span className="services-item-name">{s.name}</span>
                      {s.description && <span className="services-item-desc">{s.description}</span>}
                    </div>
                    <code className="services-item-port">{s.protocol.toUpperCase()}:{s.ports}</code>
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
        <table className="unifi-table">
          <thead>
            <tr>
              <th style={{ width: '180px' }}>Service</th>
              <th style={{ width: '120px' }}>Protocol</th>
              <th style={{ width: '120px' }}>Port(s)</th>
              <th style={{ width: '180px' }}>Device</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 500 }}>{s.name}</td>
                <td><span className="badge badge-blue">{s.protocol.toUpperCase()}</span></td>
                <td><code style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px' }}>{s.ports}</code></td>
                <td>{s.device.name} <span style={{ color: '#94a3b8', fontSize: '11px' }}>({s.device.ipAddress})</span></td>
                <td style={{ color: 'var(--unifi-text-muted)' }}>{s.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ServicesView
