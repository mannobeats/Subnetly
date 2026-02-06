'use client'

import { useState, useEffect, useMemo } from 'react'
import { IPAddress, IPRange } from '@/types'
import { ChevronDown, Info, Plus, Trash2, Globe } from 'lucide-react'

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
  vlan?: { vid: number; name: string; id: string } | null
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

const emptySubnetForm = { prefix: '', mask: '24', description: '', gateway: '', vlanId: '', role: '' }
const emptyRangeForm = { startOctet: '', endOctet: '', role: 'dhcp', description: '' }
const emptyIpForm = { address: '', dnsName: '', description: '', status: 'active' }

const IPPlannerView = ({ searchTerm, onAddDevice }: IPPlannerProps) => {
  const [subnets, setSubnets] = useState<SubnetWithRelations[]>([])
  const [selectedSubnet, setSelectedSubnet] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [vlans, setVlans] = useState<{ id: string; vid: number; name: string }[]>([])

  // Modals
  const [subnetModalOpen, setSubnetModalOpen] = useState(false)
  const [rangeModalOpen, setRangeModalOpen] = useState(false)
  const [ipModalOpen, setIpModalOpen] = useState(false)
  const [deleteSubnetModal, setDeleteSubnetModal] = useState(false)
  const [subnetForm, setSubnetForm] = useState(emptySubnetForm)
  const [rangeForm, setRangeForm] = useState(emptyRangeForm)
  const [ipForm, setIpForm] = useState(emptyIpForm)

  const fetchData = () => {
    Promise.all([
      fetch('/api/subnets').then(r => r.json()),
      fetch('/api/vlans').then(r => r.json()),
    ]).then(([subnetData, vlanData]) => {
      setSubnets(subnetData)
      setVlans(vlanData)
      if (subnetData.length > 0 && !selectedSubnet) setSelectedSubnet(subnetData[0].id)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

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
      for (let i = start; i <= end; i++) rangeMap.set(i, range)
    })
    const gatewayOctet = subnet.gateway ? parseInt(subnet.gateway.split('.').pop() || '1') : 1
    for (let i = 0; i < 256; i++) {
      const ip = ipMap.get(i)
      const range = rangeMap.get(i)
      const isGateway = i === gatewayOctet && subnet.gateway
      const isNetwork = i === 0
      const isBroadcast = i === 255
      let status: string
      if (isNetwork) status = 'network'
      else if (isBroadcast) status = 'broadcast'
      else if (isGateway) status = 'gateway'
      else if (ip) status = 'assigned'
      else if (range) status = range.role
      else status = 'available'
      cells.push({ octet: i, fullIp: `${subnet.prefix.split('.').slice(0, 3).join('.')}.${i}`, status, ip, range, isGateway: !!isGateway })
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
    return { used, total: 254, pct: Math.round((used / 254) * 100) }
  }, [subnet])

  // Subnet CRUD
  const handleCreateSubnet = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/subnets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix: subnetForm.prefix,
        mask: parseInt(subnetForm.mask),
        description: subnetForm.description || null,
        gateway: subnetForm.gateway || null,
        vlanId: subnetForm.vlanId || null,
        role: subnetForm.role || null,
        status: 'active',
      }),
    })
    if (res.ok) {
      const newSubnet = await res.json()
      setSubnetModalOpen(false)
      setSubnetForm(emptySubnetForm)
      fetchData()
      setSelectedSubnet(newSubnet.id)
    } else { alert('Failed to create subnet') }
  }

  const handleDeleteSubnet = async () => {
    if (!selectedSubnet) return
    const res = await fetch(`/api/subnets/${selectedSubnet}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteSubnetModal(false)
      setSelectedSubnet(null)
      fetchData()
    }
  }

  // IP Range CRUD
  const handleCreateRange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subnet) return
    const base = subnet.prefix.split('.').slice(0, 3).join('.')
    const res = await fetch('/api/ranges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startAddr: `${base}.${rangeForm.startOctet}`,
        endAddr: `${base}.${rangeForm.endOctet}`,
        subnetId: subnet.id,
        role: rangeForm.role,
        description: rangeForm.description || null,
      }),
    })
    if (res.ok) {
      setRangeModalOpen(false)
      setRangeForm(emptyRangeForm)
      fetchData()
    } else { alert('Failed to create IP range') }
  }

  // IP Address assign
  const handleAssignIp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subnet) return
    const res = await fetch('/api/ipam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: ipForm.address,
        mask: subnet.mask,
        subnetId: subnet.id,
        status: ipForm.status,
        dnsName: ipForm.dnsName || null,
        description: ipForm.description || null,
      }),
    })
    if (res.ok) {
      setIpModalOpen(false)
      setIpForm(emptyIpForm)
      fetchData()
    } else { alert('Failed to assign IP') }
  }

  const handleDeleteIp = async (ipId: string) => {
    const res = await fetch(`/api/ipam/${ipId}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  const openAssignFromGrid = (fullIp: string) => {
    setIpForm({ address: fullIp, dnsName: '', description: '', status: 'active' })
    setIpModalOpen(true)
  }

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

  // No subnets - empty state
  if (subnets.length === 0) {
    return (
      <div className="ipam-view animate-fade-in">
        <div className="empty-state">
          <Globe size={40} color="#cbd5e1" />
          <h3>No subnets configured</h3>
          <p>Create your first subnet to start planning IP addresses.</p>
          <button className="btn btn-primary" onClick={() => { setSubnetForm(emptySubnetForm); setSubnetModalOpen(true) }}><Plus size={14} /> Create Subnet</button>
        </div>
        {subnetModalOpen && renderSubnetModal()}
      </div>
    )
  }

  function renderSubnetModal() {
    return (
      <div className="modal-overlay">
        <div className="modal-content animate-fade-in">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>Create Subnet</h2>
          <form onSubmit={handleCreateSubnet}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Network Prefix</label>
                <input required className="unifi-input" value={subnetForm.prefix} onChange={e => setSubnetForm({ ...subnetForm, prefix: e.target.value })} placeholder="e.g. 10.0.10.0" />
              </div>
              <div className="input-group">
                <label className="input-label">Mask</label>
                <select className="unifi-input" value={subnetForm.mask} onChange={e => setSubnetForm({ ...subnetForm, mask: e.target.value })}>
                  <option value="8">/8</option>
                  <option value="16">/16</option>
                  <option value="24">/24</option>
                  <option value="25">/25</option>
                  <option value="26">/26</option>
                  <option value="27">/27</option>
                  <option value="28">/28</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Gateway</label>
                <input className="unifi-input" value={subnetForm.gateway} onChange={e => setSubnetForm({ ...subnetForm, gateway: e.target.value })} placeholder="e.g. 10.0.10.1" />
              </div>
              <div className="input-group">
                <label className="input-label">VLAN</label>
                <select className="unifi-input" value={subnetForm.vlanId} onChange={e => setSubnetForm({ ...subnetForm, vlanId: e.target.value })}>
                  <option value="">None</option>
                  {vlans.map(v => <option key={v.id} value={v.id}>VLAN {v.vid} — {v.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Role</label>
                <select className="unifi-input" value={subnetForm.role} onChange={e => setSubnetForm({ ...subnetForm, role: e.target.value })}>
                  <option value="">None</option>
                  <option value="production">Production</option>
                  <option value="management">Management</option>
                  <option value="iot">IoT</option>
                  <option value="guest">Guest</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <input className="unifi-input" value={subnetForm.description} onChange={e => setSubnetForm({ ...subnetForm, description: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setSubnetModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Subnet</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="ipam-view animate-fade-in">
      {/* Toolbar */}
      <div className="ipam-toolbar">
        <div className="ipam-subnet-selector">
          <label className="input-label" style={{ marginBottom: '0' }}>Subnet</label>
          <div className="ipam-select-wrap">
            <select className="unifi-input" value={selectedSubnet || ''} onChange={e => setSelectedSubnet(e.target.value)} style={{ paddingRight: '2rem' }}>
              {subnets.map(s => (
                <option key={s.id} value={s.id}>{s.prefix}/{s.mask} — {s.description || 'Unnamed'} {s.vlan ? `(VLAN ${s.vlan.vid})` : ''}</option>
              ))}
            </select>
            <ChevronDown size={14} className="ipam-select-chevron" />
          </div>
        </div>
        <div className="ipam-util-section">
          <div className="ipam-util-header">
            <span className="ipam-util-label">Utilization</span>
            <span className="ipam-util-pct" style={{ color: utilization.pct > 80 ? '#ef4444' : utilization.pct > 50 ? '#f59e0b' : '#10b981' }}>{utilization.pct}%</span>
          </div>
          <div className="ipam-util-bar">
            <div className="ipam-util-fill" style={{ width: `${utilization.pct}%`, background: utilization.pct > 80 ? '#ef4444' : utilization.pct > 50 ? '#f59e0b' : '#10b981' }} />
          </div>
          <span className="ipam-util-detail">{utilization.used} / {utilization.total} addresses used</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => { setSubnetForm(emptySubnetForm); setSubnetModalOpen(true) }}><Plus size={14} /> Subnet</button>
          {subnet && <button className="btn" onClick={() => { setRangeForm(emptyRangeForm); setRangeModalOpen(true) }}><Plus size={14} /> Range</button>}
          {subnet && <button className="btn" onClick={() => setDeleteSubnetModal(true)} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>}
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
                {r.description && <span className="ipam-range-desc">{r.description}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* IP Grid */}
      {subnet && (
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
                  style={{ background: colors.bg, color: colors.color, opacity: dimmed ? 0.25 : 1 }}
                  onMouseEnter={() => setHoveredCell(cell.octet)}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => {
                    if (cell.status === 'available' || cell.status === 'dhcp' || cell.status === 'reserved' || cell.status === 'infrastructure') {
                      if (onAddDevice) onAddDevice(cell.fullIp)
                      else openAssignFromGrid(cell.fullIp)
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
      )}

      {/* Hover Tooltip */}
      {hoveredCell !== null && (() => {
        const cell = cellData[hoveredCell]
        if (!cell) return null
        return (
          <div className="ipam-tooltip">
            <Info size={12} />
            <div className="ipam-tooltip-content">
              <strong>{cell.fullIp}</strong>
              {cell.isGateway && <span className="badge badge-green">Gateway</span>}
              {cell.ip && <span>{cell.ip.dnsName || 'Unnamed'}</span>}
              {cell.ip?.description && <span className="ipam-tooltip-desc">{cell.ip.description}</span>}
              {!cell.ip && cell.range && <span className={`badge badge-${cell.range.role === 'dhcp' ? 'orange' : cell.range.role === 'reserved' ? 'purple' : 'blue'}`}>{cell.range.role} range</span>}
              {(cell.status === 'available' || cell.status === 'dhcp' || cell.status === 'reserved' || cell.status === 'infrastructure') && !cell.ip && <span className="ipam-tooltip-action">Click to assign</span>}
            </div>
          </div>
        )
      })()}

      {/* Address Table */}
      {subnet && (
        <div className="ipam-table-section">
          <div className="dash-section-header">
            <h2>Assigned Addresses</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="dash-section-badge">{subnet.ipAddresses.length} addresses</span>
              <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => { setIpForm({ address: `${subnet.prefix.split('.').slice(0, 3).join('.')}.`, dnsName: '', description: '', status: 'active' }); setIpModalOpen(true) }}><Plus size={12} /> Assign IP</button>
            </div>
          </div>
          {subnet.ipAddresses.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--unifi-text-muted)', fontSize: '13px' }}>No IP addresses assigned yet. Click a cell in the grid or use the button above.</div>
          ) : (
            <table className="unifi-table">
              <thead>
                <tr>
                  <th style={{ width: '140px' }}>Address</th>
                  <th style={{ width: '180px' }}>DNS Name</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th>Description</th>
                  <th style={{ width: '60px', textAlign: 'right', paddingRight: '1rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {subnet.ipAddresses
                  .sort((a, b) => parseInt(a.address.split('.').pop() || '0') - parseInt(b.address.split('.').pop() || '0'))
                  .map(ip => (
                    <tr key={ip.id}>
                      <td><code style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px' }}>{ip.address}/{ip.mask}</code></td>
                      <td style={{ fontWeight: 500 }}>{ip.dnsName || '—'}</td>
                      <td><span className="badge badge-green">{ip.status}</span></td>
                      <td style={{ color: 'var(--unifi-text-muted)' }}>{ip.description || '—'}</td>
                      <td style={{ textAlign: 'right', paddingRight: '0.5rem' }}>
                        <button className="btn" style={{ padding: '0 6px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => handleDeleteIp(ip.id)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Subnet Create Modal */}
      {subnetModalOpen && renderSubnetModal()}

      {/* Range Create Modal */}
      {rangeModalOpen && subnet && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>Add IP Range to {subnet.prefix}/{subnet.mask}</h2>
            <form onSubmit={handleCreateRange}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Start Octet (.x)</label>
                  <input required type="number" min="1" max="254" className="unifi-input" value={rangeForm.startOctet} onChange={e => setRangeForm({ ...rangeForm, startOctet: e.target.value })} placeholder="e.g. 150" />
                </div>
                <div className="input-group">
                  <label className="input-label">End Octet (.x)</label>
                  <input required type="number" min="1" max="254" className="unifi-input" value={rangeForm.endOctet} onChange={e => setRangeForm({ ...rangeForm, endOctet: e.target.value })} placeholder="e.g. 199" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select className="unifi-input" value={rangeForm.role} onChange={e => setRangeForm({ ...rangeForm, role: e.target.value })}>
                    <option value="dhcp">DHCP Pool</option>
                    <option value="reserved">Reserved</option>
                    <option value="infrastructure">Infrastructure</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <input className="unifi-input" value={rangeForm.description} onChange={e => setRangeForm({ ...rangeForm, description: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setRangeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Range</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IP Assign Modal */}
      {ipModalOpen && subnet && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>Assign IP Address</h2>
            <form onSubmit={handleAssignIp}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">IP Address</label>
                  <input required className="unifi-input" value={ipForm.address} onChange={e => setIpForm({ ...ipForm, address: e.target.value })} placeholder="e.g. 10.0.10.20" />
                </div>
                <div className="input-group">
                  <label className="input-label">DNS Name</label>
                  <input className="unifi-input" value={ipForm.dnsName} onChange={e => setIpForm({ ...ipForm, dnsName: e.target.value })} placeholder="e.g. my-server" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <input className="unifi-input" value={ipForm.description} onChange={e => setIpForm({ ...ipForm, description: e.target.value })} placeholder="Optional" />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setIpModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign IP</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subnet Modal */}
      {deleteSubnetModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ background: '#fee2e2', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#dc2626' }}><Trash2 size={24} /></div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '18px', fontWeight: 600 }}>Delete Subnet?</h2>
            <p style={{ color: 'var(--unifi-text-muted)', marginBottom: '2rem' }}>This will remove the subnet and all associated IP addresses and ranges.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setDeleteSubnetModal(false)}>Cancel</button>
              <button className="btn btn-destructive" onClick={handleDeleteSubnet}>Delete Subnet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IPPlannerView
