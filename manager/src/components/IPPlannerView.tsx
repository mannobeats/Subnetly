'use client'

import { useState, useEffect, useMemo } from 'react'
import { IPAddress, IPRange } from '@/types'
import { ChevronDown, Info } from 'lucide-react'

interface SubnetWithRelations {
  id: string
  prefix: string
  mask: number
  description?: string | null
  gateway?: string | null
  status: string
  role?: string | null
  ipAddresses: IPAddress[]
  ipRanges: IPRange[]
  vlan?: { vid: number; name: string } | null
}

interface IPPlannerProps {
  searchTerm: string
  onAddDevice?: (ip: string) => void
}

const rangeColors: Record<string, { bg: string; border: string; label: string }> = {
  dhcp: { bg: '#fef3c7', border: '#f59e0b', label: 'DHCP' },
  reserved: { bg: '#ede9fe', border: '#8b5cf6', label: 'Reserved' },
  infrastructure: { bg: '#cffafe', border: '#06b6d4', label: 'Infra' },
  general: { bg: '#f1f5f9', border: '#94a3b8', label: 'General' },
}

const IPPlannerView = ({ searchTerm, onAddDevice }: IPPlannerProps) => {
  const [subnets, setSubnets] = useState<SubnetWithRelations[]>([])
  const [selectedSubnet, setSelectedSubnet] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subnets')
      .then(r => r.json())
      .then((data: SubnetWithRelations[]) => {
        setSubnets(data)
        if (data.length > 0) setSelectedSubnet(data[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  const subnet = useMemo(() => subnets.find(s => s.id === selectedSubnet), [subnets, selectedSubnet])

  const cellData = useMemo(() => {
    if (!subnet) return []
    const cells = []
    const ipMap = new Map<number, IPAddress>()
    subnet.ipAddresses.forEach(ip => {
      const octet = parseInt(ip.address.split('.').pop() || '0')
      ipMap.set(octet, ip)
    })

    const rangeMap = new Map<number, IPRange>()
    subnet.ipRanges.forEach(range => {
      const start = parseInt(range.startAddr.split('.').pop() || '0')
      const end = parseInt(range.endAddr.split('.').pop() || '0')
      for (let i = start; i <= end; i++) {
        rangeMap.set(i, range)
      }
    })

    const gatewayOctet = subnet.gateway ? parseInt(subnet.gateway.split('.').pop() || '1') : 1

    for (let i = 0; i < 256; i++) {
      const ip = ipMap.get(i)
      const range = rangeMap.get(i)
      const isGateway = i === gatewayOctet
      const isNetwork = i === 0
      const isBroadcast = i === 255

      let status: 'network' | 'broadcast' | 'gateway' | 'assigned' | 'dhcp' | 'reserved' | 'infrastructure' | 'available'
      if (isNetwork) status = 'network'
      else if (isBroadcast) status = 'broadcast'
      else if (isGateway) status = 'gateway'
      else if (ip) status = 'assigned'
      else if (range) status = range.role as typeof status
      else status = 'available'

      cells.push({
        octet: i,
        fullIp: `${subnet.prefix.split('.').slice(0, 3).join('.')}.${i}`,
        status,
        ip,
        range,
        isGateway,
      })
    }
    return cells
  }, [subnet])

  const filteredCells = useMemo(() => {
    if (!searchTerm) return cellData
    return cellData.map(c => ({
      ...c,
      highlighted: c.ip?.dnsName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.fullIp.includes(searchTerm) ||
        c.ip?.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    }))
  }, [cellData, searchTerm])

  const utilization = useMemo(() => {
    if (!subnet) return { used: 0, total: 254, pct: 0 }
    const used = subnet.ipAddresses.length
    const total = 254
    return { used, total, pct: Math.round((used / total) * 100) }
  }, [subnet])

  if (loading) return <div className="view-loading">Loading IP Planner...</div>

  const getCellColor = (status: string) => {
    switch (status) {
      case 'network': return { bg: '#1e293b', color: '#fff' }
      case 'broadcast': return { bg: '#1e293b', color: '#fff' }
      case 'gateway': return { bg: '#10b981', color: '#fff' }
      case 'assigned': return { bg: '#0055ff', color: '#fff' }
      case 'dhcp': return { bg: '#fef3c7', color: '#92400e' }
      case 'reserved': return { bg: '#ede9fe', color: '#5b21b6' }
      case 'infrastructure': return { bg: '#cffafe', color: '#155e75' }
      default: return { bg: '#f1f3f5', color: '#adb5bd' }
    }
  }

  return (
    <div className="ipam-view animate-fade-in">
      {/* Subnet Selector */}
      <div className="ipam-toolbar">
        <div className="ipam-subnet-selector">
          <label className="input-label" style={{ marginBottom: '0' }}>Subnet</label>
          <div className="ipam-select-wrap">
            <select
              className="unifi-input"
              value={selectedSubnet || ''}
              onChange={e => setSelectedSubnet(e.target.value)}
              style={{ paddingRight: '2rem' }}
            >
              {subnets.map(s => (
                <option key={s.id} value={s.id}>
                  {s.prefix}/{s.mask} — {s.description} {s.vlan ? `(VLAN ${s.vlan.vid})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="ipam-select-chevron" />
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="ipam-util-section">
          <div className="ipam-util-header">
            <span className="ipam-util-label">Utilization</span>
            <span className="ipam-util-pct" style={{ color: utilization.pct > 80 ? '#ef4444' : utilization.pct > 50 ? '#f59e0b' : '#10b981' }}>
              {utilization.pct}%
            </span>
          </div>
          <div className="ipam-util-bar">
            <div
              className="ipam-util-fill"
              style={{
                width: `${utilization.pct}%`,
                background: utilization.pct > 80 ? '#ef4444' : utilization.pct > 50 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
          <span className="ipam-util-detail">{utilization.used} / {utilization.total} addresses used</span>
        </div>
      </div>

      {/* IP Range Legend */}
      {subnet && subnet.ipRanges.length > 0 && (
        <div className="ipam-ranges-bar">
          {subnet.ipRanges.map((r, i) => {
            const rc = rangeColors[r.role] || rangeColors.general
            return (
              <div key={i} className="ipam-range-tag" style={{ background: rc.bg, borderColor: rc.border }}>
                <div className="ipam-range-dot" style={{ background: rc.border }} />
                <span>{rc.label}: .{r.startAddr.split('.').pop()} — .{r.endAddr.split('.').pop()}</span>
                <span className="ipam-range-desc">{r.description}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* IP Grid */}
      <div className="ipam-grid-container">
        <div className="ipam-grid">
          {filteredCells.map((cell) => {
            const colors = getCellColor(cell.status)
            const isHighlighted = 'highlighted' in cell && cell.highlighted
            const dimmed = searchTerm && !isHighlighted && cell.status !== 'gateway'
            return (
              <div
                key={cell.octet}
                className={`ipam-cell ${cell.status} ${isHighlighted ? 'highlighted' : ''} ${dimmed ? 'dimmed' : ''}`}
                style={{
                  background: colors.bg,
                  color: colors.color,
                  opacity: dimmed ? 0.25 : 1,
                }}
                onMouseEnter={() => setHoveredCell(cell.octet)}
                onMouseLeave={() => setHoveredCell(null)}
                onClick={() => {
                  if (cell.status === 'available' && onAddDevice) {
                    onAddDevice(cell.fullIp)
                  }
                }}
              >
                <span className="ipam-cell-num">{cell.octet}</span>
                {cell.ip?.dnsName && (
                  <span className="ipam-cell-label">{cell.ip.dnsName.length > 6 ? cell.ip.dnsName.slice(0, 6) + '…' : cell.ip.dnsName}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredCell !== null && (
        <div className="ipam-tooltip">
          <Info size={12} />
          {(() => {
            const cell = cellData[hoveredCell]
            if (!cell) return null
            return (
              <div className="ipam-tooltip-content">
                <strong>{cell.fullIp}</strong>
                {cell.isGateway && <span className="badge badge-green">Gateway</span>}
                {cell.ip && (
                  <>
                    <span>{cell.ip.dnsName || 'Unnamed'}</span>
                    {cell.ip.description && <span className="ipam-tooltip-desc">{cell.ip.description}</span>}
                  </>
                )}
                {!cell.ip && cell.range && (
                  <span className={`badge badge-${cell.range.role === 'dhcp' ? 'orange' : cell.range.role === 'reserved' ? 'purple' : 'blue'}`}>
                    {cell.range.role} range
                  </span>
                )}
                {cell.status === 'available' && <span className="ipam-tooltip-action">Click to assign</span>}
              </div>
            )
          })()}
        </div>
      )}

      {/* Address Table */}
      <div className="ipam-table-section">
        <div className="dash-section-header">
          <h2>Assigned Addresses</h2>
          <span className="dash-section-badge">{subnet?.ipAddresses.length || 0} addresses</span>
        </div>
        <table className="unifi-table">
          <thead>
            <tr>
              <th style={{ width: '140px' }}>Address</th>
              <th style={{ width: '180px' }}>DNS Name</th>
              <th style={{ width: '100px' }}>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {subnet?.ipAddresses
              .sort((a, b) => {
                const aOctet = parseInt(a.address.split('.').pop() || '0')
                const bOctet = parseInt(b.address.split('.').pop() || '0')
                return aOctet - bOctet
              })
              .map(ip => (
                <tr key={ip.id}>
                  <td><code style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px' }}>{ip.address}/{ip.mask}</code></td>
                  <td style={{ fontWeight: 500 }}>{ip.dnsName || '—'}</td>
                  <td><span className="badge badge-green">{ip.status}</span></td>
                  <td style={{ color: 'var(--unifi-text-muted)' }}>{ip.description || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default IPPlannerView
