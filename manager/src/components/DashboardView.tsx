'use client'

import { useState, useEffect } from 'react'
import { Server, Globe, Network, Box, Activity, ArrowUpRight, ArrowDownRight, Wifi, FileDown } from 'lucide-react'
import { CustomCategory } from '@/types'

interface DashboardData {
  counts: { devices: number; subnets: number; vlans: number; ipAddresses: number; services: number; wifiNetworks: number; monitored: number }
  categoryBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
  healthBreakdown: Record<string, number>
  subnetStats: { id: string; prefix: string; description: string; gateway: string; vlan: { vid: number; name: string } | null; totalIps: number; usedIps: number; utilization: number; ranges: { role: string; startAddr: string; endAddr: string }[] }[]
  recentChanges: { id: string; objectType: string; action: string; changes: string; timestamp: string }[]
  services: { id: string; name: string; protocol: string; ports: string; device: { name: string; ipAddress: string }; healthStatus: string; uptimePercent: number | null; lastResponseTime: number | null; healthCheckEnabled: boolean; url: string | null; environment: string; isDocker: boolean }[]
  wifiNetworks: { id: string; ssid: string; security: string; band: string; enabled: boolean; guestNetwork: boolean; vlan: { vid: number; name: string } | null; subnet: { prefix: string; mask: number } | null }[]
}

const healthDotColors: Record<string, string> = {
  healthy: '#22c55e',
  degraded: '#f59e0b',
  down: '#ef4444',
  unknown: '#94a3b8',
}

interface DashboardViewProps {
  categories?: CustomCategory[]
}

const DashboardView = ({ categories = [] }: DashboardViewProps) => {
  const categoryColorMap: Record<string, string> = {}
  const categoryIconMap: Record<string, string> = {}
  categories.forEach(c => { categoryColorMap[c.name] = c.color; categoryIconMap[c.name] = c.icon })
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return <div className="view-loading">Loading dashboard...</div>

  const wifiEnabled = (data.wifiNetworks || []).filter(w => w.enabled).length
  const healthyCount = data.healthBreakdown?.healthy || 0
  const downCount = data.healthBreakdown?.down || 0
  const statCards = [
    { label: 'Devices', value: data.counts.devices, icon: Server, color: '#0055ff', sub: `${data.statusBreakdown['active'] || 0} active` },
    { label: 'Subnets', value: data.counts.subnets, icon: Globe, color: '#10b981', sub: `${data.counts.ipAddresses} IPs tracked` },
    { label: 'VLANs', value: data.counts.vlans, icon: Network, color: '#7c3aed', sub: 'Configured' },
    { label: 'WiFi', value: data.counts.wifiNetworks || 0, icon: Wifi, color: '#06b6d4', sub: `${wifiEnabled} enabled` },
    { label: 'Services', value: data.counts.services, icon: Box, color: '#f97316', sub: `${healthyCount} healthy${downCount > 0 ? ` · ${downCount} down` : ''}` },
    { label: 'Monitored', value: data.counts.monitored || 0, icon: Activity, color: '#22c55e', sub: `${healthyCount} healthy` },
  ]

  const handleExport = () => {
    window.open('/api/export', '_blank')
  }

  return (
    <div className="dashboard-view animate-fade-in">
      {/* Export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><FileDown size={14} /> Export Documentation</button>
      </div>

      {/* Stat Cards */}
      <div className="dash-stat-grid">
        {statCards.map((s, i) => (
          <div key={i} className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: `${s.color}12`, color: s.color }}>
              <s.icon size={20} />
            </div>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{s.value}</span>
              <span className="dash-stat-label">{s.label}</span>
              <span className="dash-stat-sub">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Subnet Utilization */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2>Subnet Utilization</h2>
          <span className="dash-section-badge">{data.subnetStats.length} subnets</span>
        </div>
        <div className="dash-subnet-grid" style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {data.subnetStats.map((s) => (
            <div key={s.id} className="dash-subnet-card">
              <div className="dash-subnet-header">
                <code className="dash-subnet-prefix">{s.prefix}</code>
                {s.vlan && <span className="badge badge-blue">VLAN {s.vlan.vid}</span>}
              </div>
              <div className="dash-subnet-desc">{s.description}</div>
              <div className="dash-utilization-bar-container">
                <div className="dash-utilization-bar">
                  <div
                    className="dash-utilization-fill"
                    style={{
                      width: `${s.utilization}%`,
                      background: s.utilization > 80 ? '#ef4444' : s.utilization > 50 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
                <div className="dash-utilization-stats">
                  <span>{s.usedIps} / {s.totalIps} IPs used</span>
                  <span className="dash-utilization-pct" style={{ color: s.utilization > 80 ? '#ef4444' : s.utilization > 50 ? '#f59e0b' : '#10b981' }}>
                    {s.utilization}%
                  </span>
                </div>
              </div>
              {s.ranges.length > 0 && (
                <div className="dash-subnet-ranges">
                  {s.ranges.map((r, i) => (
                    <span key={i} className={`badge badge-${r.role === 'dhcp' ? 'orange' : r.role === 'reserved' ? 'purple' : 'blue'}`}>
                      {r.role}: {r.startAddr.split('.').pop()}-{r.endAddr.split('.').pop()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="dash-two-col">
        {/* Category Breakdown */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2>Device Categories</h2>
          </div>
          <div className="dash-category-list" style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {Object.entries(data.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className="dash-category-row">
                <div className="dash-category-info">
                  <div className="dash-category-dot" style={{ background: categoryColorMap[cat] || '#64748b' }} />
                  <span>{cat}</span>
                </div>
                <div className="dash-category-bar-wrap">
                  <div className="dash-category-bar">
                    <div className="dash-category-fill" style={{ width: `${(count / data.counts.devices) * 100}%`, background: categoryColorMap[cat] || '#64748b' }} />
                  </div>
                  <span className="dash-category-count">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Changes */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2>Recent Changes</h2>
            <Activity size={14} color="var(--unifi-text-muted)" />
          </div>
          <div className="dash-changelog" style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {data.recentChanges.map((c) => {
              const isCreate = c.action === 'create'
              return (
                <div key={c.id} className="dash-change-item">
                  <div className={`dash-change-icon ${isCreate ? 'create' : 'update'}`}>
                    {isCreate ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  </div>
                  <div className="dash-change-info">
                    <span className="dash-change-action">{c.action} {c.objectType}</span>
                    <span className="dash-change-time">{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="dash-two-col">
        {/* WiFi Networks Overview */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2>WiFi Networks</h2>
            <span className="dash-section-badge">{(data.wifiNetworks || []).length} networks</span>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {(data.wifiNetworks || []).length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--unifi-text-muted)', fontSize: '13px' }}>No WiFi networks configured</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(data.wifiNetworks || []).map(w => {
                  const secColor = w.security.startsWith('wpa3') ? '#10b981' : w.security.startsWith('wpa2') ? '#0055ff' : w.security === 'open' ? '#ef4444' : '#64748b'
                  return (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'var(--card-bg, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', opacity: w.enabled ? 1 : 0.5 }}>
                      <Wifi size={16} color={secColor} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '12px' }}>{w.ssid}</div>
                        <div style={{ fontSize: '10px', color: 'var(--unifi-text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span>{w.security === 'open' ? 'Open' : w.security.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <span>·</span>
                          <span>{w.band === 'both' ? '2.4+5 GHz' : w.band}</span>
                          {w.vlan && <><span>·</span><span>VLAN {w.vlan.vid}</span></>}
                        </div>
                      </div>
                      <span className={`badge badge-${w.enabled ? 'green' : 'orange'}`} style={{ fontSize: '9px' }}>{w.enabled ? 'on' : 'off'}</span>
                      {w.guestNetwork && <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '9px' }}>Guest</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Services Overview — Health Aware */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2>Services Health</h2>
            <span className="dash-section-badge">{data.services.length} services</span>
          </div>
          <div className="dash-services-grid" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {data.services.map((s) => {
              const dotColor = healthDotColors[s.healthStatus] || healthDotColors.unknown
              return (
                <div key={s.id} className="dash-service-card" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <div className="dash-service-name" style={{ flex: 1, minWidth: 0 }}>{s.name}</div>
                    {s.healthCheckEnabled && s.uptimePercent != null && (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: s.uptimePercent >= 99 ? '#22c55e' : s.uptimePercent >= 90 ? '#f59e0b' : '#ef4444' }}>
                        {s.uptimePercent}%
                      </span>
                    )}
                  </div>
                  <div className="dash-service-detail" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <code>{s.protocol.toUpperCase()}:{s.ports}</code>
                    <span className="dash-service-device">{s.device.name}</span>
                    {s.isDocker && <span style={{ fontSize: '9px', background: '#dbeafe', color: '#1e40af', padding: '1px 4px', borderRadius: '3px' }}>Docker</span>}
                    {s.lastResponseTime != null && <span style={{ fontSize: '9px', color: '#94a3b8' }}>{s.lastResponseTime}ms</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardView
