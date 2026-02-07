'use client'

import { useState, useEffect } from 'react'
import { Server, Globe, Network, Box, Activity, ArrowUpRight, ArrowDownRight, Wifi, FileDown } from 'lucide-react'
import { CustomCategory } from '@/types'
import { Button } from '@/components/ui/button'

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

  if (loading || !data) return <div className="flex items-center justify-center h-[200px] text-muted-foreground text-[13px]">Loading dashboard...</div>

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

  const utilColor = (pct: number) => pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981'

  return (
    <div className="animate-in fade-in duration-300">
      {/* Export button */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileDown size={14} /> Export Documentation
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${s.color}12`, color: s.color }}>
              <s.icon size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold leading-none">{s.value}</span>
              <span className="text-xs text-muted-foreground font-medium mt-1">{s.label}</span>
              <span className="text-[11px] text-(--text-light) mt-0.5">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Subnet Utilization */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-semibold">Subnet Utilization</h2>
          <span className="text-[11px] text-muted-foreground bg-(--muted-bg) px-2 py-0.5 rounded">{data.subnetStats.length} subnets</span>
        </div>
        <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto">
          {data.subnetStats.map((s) => (
            <div key={s.id} className="bg-(--surface-alt) border border-border rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <code className="text-[13px] font-semibold bg-(--muted-bg) px-2 py-0.5 rounded">{s.prefix}</code>
                {s.vlan && <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-(--blue-bg) text-(--blue)">VLAN {s.vlan.vid}</span>}
              </div>
              <div className="text-xs text-muted-foreground mb-3">{s.description}</div>
              <div className="mb-2">
                <div className="h-1.5 bg-(--muted-bg) rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all duration-600" style={{ width: `${s.utilization}%`, background: utilColor(s.utilization) }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{s.usedIps} / {s.totalIps} IPs used</span>
                  <span className="font-semibold" style={{ color: utilColor(s.utilization) }}>{s.utilization}%</span>
                </div>
              </div>
              {s.ranges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.ranges.map((r, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded text-[11px] font-semibold ${r.role === 'dhcp' ? 'bg-(--orange-bg) text-(--orange)' : r.role === 'reserved' ? 'bg-(--purple-bg) text-(--purple)' : 'bg-(--blue-bg) text-(--blue)'}`}>
                      {r.role}: {r.startAddr.split('.').pop()}-{r.endAddr.split('.').pop()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Category Breakdown */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold">Device Categories</h2>
          </div>
          <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
            {Object.entries(data.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium min-w-[100px]">
                  <div className="w-2 h-2 rounded-sm" style={{ background: categoryColorMap[cat] || '#64748b' }} />
                  <span>{cat}</span>
                </div>
                <div className="flex items-center gap-3 flex-1 ml-4">
                  <div className="flex-1 h-1.5 bg-(--muted-bg) rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-600" style={{ width: `${(count / data.counts.devices) * 100}%`, background: categoryColorMap[cat] || '#64748b' }} />
                  </div>
                  <span className="text-xs font-semibold min-w-5 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Changes */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold">Recent Changes</h2>
            <Activity size={14} className="text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
            {data.recentChanges.map((c) => {
              const isCreate = c.action === 'create'
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isCreate ? 'bg-(--green-bg) text-(--green)' : 'bg-(--blue-bg) text-(--blue)'}`}>
                    {isCreate ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium capitalize">{c.action} {c.objectType}</span>
                    <span className="text-[10px] text-(--text-light)">{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* WiFi Networks Overview */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold">WiFi Networks</h2>
            <span className="text-[11px] text-muted-foreground bg-(--muted-bg) px-2 py-0.5 rounded">{(data.wifiNetworks || []).length} networks</span>
          </div>
          <div className="max-h-70 overflow-y-auto">
            {(data.wifiNetworks || []).length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-[13px]">No WiFi networks configured</div>
            ) : (
              <div className="flex flex-col gap-2">
                {(data.wifiNetworks || []).map(w => {
                  const secColor = w.security.startsWith('wpa3') ? '#10b981' : w.security.startsWith('wpa2') ? '#0055ff' : w.security === 'open' ? '#ef4444' : '#64748b'
                  return (
                    <div key={w.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-(--surface-alt) border border-border" style={{ opacity: w.enabled ? 1 : 0.5 }}>
                      <Wifi size={16} style={{ color: secColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs">{w.ssid}</div>
                        <div className="text-[10px] text-muted-foreground flex gap-1.5 items-center">
                          <span>{w.security === 'open' ? 'Open' : w.security.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <span>·</span>
                          <span>{w.band === 'both' ? '2.4+5 GHz' : w.band}</span>
                          {w.vlan && <><span>·</span><span>VLAN {w.vlan.vid}</span></>}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${w.enabled ? 'bg-(--green-bg) text-(--green)' : 'bg-(--orange-bg) text-(--orange)'}`}>{w.enabled ? 'on' : 'off'}</span>
                      {w.guestNetwork && <span className="px-1 py-px rounded text-[9px] bg-[#fef3c7] text-[#92400e]">Guest</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Services Overview — Health Aware */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold">Services Health</h2>
            <span className="text-[11px] text-muted-foreground bg-(--muted-bg) px-2 py-0.5 rounded">{data.services.length} services</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 max-h-70 overflow-y-auto">
            {data.services.map((s) => {
              const dotColor = healthDotColors[s.healthStatus] || healthDotColors.unknown
              return (
                <div key={s.id} className="bg-(--surface-alt) border border-border rounded-md p-3 relative">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                    <div className="text-xs font-semibold flex-1 min-w-0 truncate">{s.name}</div>
                    {s.healthCheckEnabled && s.uptimePercent != null && (
                      <span className="text-[10px] font-semibold" style={{ color: s.uptimePercent >= 99 ? '#22c55e' : s.uptimePercent >= 90 ? '#f59e0b' : '#ef4444' }}>
                        {s.uptimePercent}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] mt-1">
                    <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px]">{s.protocol.toUpperCase()}:{s.ports}</code>
                    <span className="text-muted-foreground text-[10px]">{s.device.name}</span>
                    {s.isDocker && <span className="text-[9px] bg-[#dbeafe] text-[#1e40af] px-1 py-px rounded">Docker</span>}
                    {s.lastResponseTime != null && <span className="text-[9px] text-(--text-light)">{s.lastResponseTime}ms</span>}
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
