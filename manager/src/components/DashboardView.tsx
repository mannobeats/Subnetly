'use client'

import { useState, useEffect } from 'react'
import { Server, Globe, Network, Box, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { CustomCategory } from '@/types'

interface DashboardData {
  counts: { devices: number; subnets: number; vlans: number; ipAddresses: number; services: number }
  categoryBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
  subnetStats: { id: string; prefix: string; description: string; gateway: string; vlan: { vid: number; name: string } | null; totalIps: number; usedIps: number; utilization: number; ranges: { role: string; startAddr: string; endAddr: string }[] }[]
  recentChanges: { id: string; objectType: string; action: string; changes: string; timestamp: string }[]
  services: { id: string; name: string; protocol: string; ports: string; device: { name: string; ipAddress: string } }[]
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

  const statCards = [
    { label: 'Devices', value: data.counts.devices, icon: Server, color: '#0055ff', sub: `${data.statusBreakdown['active'] || 0} active` },
    { label: 'Subnets', value: data.counts.subnets, icon: Globe, color: '#10b981', sub: `${data.counts.ipAddresses} IPs tracked` },
    { label: 'VLANs', value: data.counts.vlans, icon: Network, color: '#7c3aed', sub: 'Configured' },
    { label: 'Services', value: data.counts.services, icon: Box, color: '#f97316', sub: 'Running' },
  ]

  return (
    <div className="dashboard-view animate-fade-in">
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

      {/* Services Overview */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2>Running Services</h2>
          <span className="dash-section-badge">{data.services.length} services</span>
        </div>
        <div className="dash-services-grid" style={{ maxHeight: '280px', overflowY: 'auto' }}>
          {data.services.map((s) => (
            <div key={s.id} className="dash-service-card">
              <div className="dash-service-name">{s.name}</div>
              <div className="dash-service-detail">
                <code>{s.protocol.toUpperCase()}:{s.ports}</code>
                <span className="dash-service-device">{s.device.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardView
