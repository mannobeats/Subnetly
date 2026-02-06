'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Sidebar, { ViewType } from '@/components/Sidebar'
import DashboardView from '@/components/DashboardView'
import IPPlannerView from '@/components/IPPlannerView'
import VLANView from '@/components/VLANView'
import TopologyView from '@/components/TopologyView'
import ServicesView from '@/components/ServicesView'
import ChangelogView from '@/components/ChangelogView'
import { Plus, Download, Trash2, Edit2, Network as NetIcon, ChevronRight, Laptop, Server, Cpu, Database } from 'lucide-react'
import { Device } from '@/types'

interface SubnetOption {
  id: string
  prefix: string
  mask: number
  description?: string | null
  gateway?: string | null
  vlan?: { vid: number; name: string } | null
  ipAddresses: { address: string }[]
}

export default function Home() {
  const [activeView, setActiveViewRaw] = useState<ViewType>('dashboard')

  const setActiveView = useCallback((view: ViewType) => {
    setActiveViewRaw(view)
    window.location.hash = view
  }, [])

  // Restore view from URL hash after hydration
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as ViewType
    const valid: ViewType[] = ['dashboard', 'devices', 'ipam', 'vlans', 'topology', 'services', 'changelog']
    if (valid.includes(hash)) setActiveViewRaw(hash)
  }, [])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedVlanRole, setSelectedVlanRole] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [subnets, setSubnets] = useState<SubnetOption[]>([])
  const [selectedSubnetId, setSelectedSubnetId] = useState<string>('')
  const [availableIps, setAvailableIps] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    macAddress: '',
    ipAddress: '',
    category: 'Server',
    notes: '',
    platform: '',
    status: 'active',
  })

  const exportData = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(devices, null, 2))
    const a = document.createElement('a')
    a.setAttribute("href", dataStr)
    a.setAttribute("download", `homelab_export_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [devices])

  useEffect(() => {
    fetchDevices()
    fetchSubnets()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      // Escape: close modals
      if (e.key === 'Escape') {
        if (isModalOpen) { setIsModalOpen(false); return }
        if (isDeleteModalOpen) { setIsDeleteModalOpen(false); return }
        // Blur search if focused
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur()
          setSearchTerm('')
          return
        }
      }

      // Don't handle shortcuts when typing in inputs
      if (isInput) return

      // / or Cmd+K: focus search
      if (e.key === '/' || (e.metaKey && e.key === 'k')) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      const views: ViewType[] = ['dashboard', 'devices', 'ipam', 'vlans', 'topology', 'services', 'changelog']
      // 1-7: switch views
      const num = parseInt(e.key)
      if (num >= 1 && num <= 7) {
        e.preventDefault()
        setActiveView(views[num - 1])
        return
      }

      // N: new item (context-dependent)
      if (e.key === 'n' || e.key === 'N') {
        if (activeView === 'devices') {
          e.preventDefault()
          setEditingDevice(null)
          setFormData({ name: '', macAddress: '', ipAddress: '', category: 'Server', notes: '', platform: '', status: 'active' })
          setSelectedSubnetId('')
          setAvailableIps([])
          fetchSubnets()
          setIsModalOpen(true)
        }
        return
      }

      // E: export (devices view)
      if ((e.key === 'e' || e.key === 'E') && activeView === 'devices') {
        e.preventDefault()
        exportData()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeView, isModalOpen, isDeleteModalOpen, setActiveView, exportData])

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/devices')
      const data = await res.json()
      setDevices(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubnets = async () => {
    try {
      const res = await fetch('/api/subnets')
      const data = await res.json()
      setSubnets(data)
    } catch (err) {
      console.error(err)
    }
  }

  const computeAvailableIps = (subnetId: string, autoSelect = false) => {
    const sub = subnets.find(s => s.id === subnetId)
    if (!sub) { setAvailableIps([]); return }
    const prefix = sub.prefix.trim()
    const base = prefix.split('.').slice(0, 3).join('.')
    const usedSet = new Set(sub.ipAddresses.map(ip => ip.address.trim()))
    // Also exclude IPs already used by devices
    devices.forEach(d => { if (d.ipAddress) usedSet.add(d.ipAddress.trim()) })
    const gw = sub.gateway ? sub.gateway.trim() : null
    const gatewayOctet = gw ? parseInt(gw.split('.').pop() || '1') : -1
    const ips: string[] = []
    for (let i = 1; i <= 254; i++) {
      if (i === gatewayOctet) continue
      const addr = `${base}.${i}`
      if (!usedSet.has(addr)) ips.push(addr)
    }
    setAvailableIps(ips)
    if (autoSelect && ips.length > 0) {
      setFormData(prev => ({ ...prev, ipAddress: ips[0] }))
    }
  }

  const handleSubnetChange = (subnetId: string) => {
    setSelectedSubnetId(subnetId)
    setFormData(prev => ({ ...prev, ipAddress: '' }))
    if (subnetId) {
      computeAvailableIps(subnetId, true)
    } else {
      setAvailableIps([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ipAddress || formData.ipAddress.trim() === '') {
      alert('Please select or enter an IP address')
      return
    }
    if (!formData.ipAddress.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
      alert('Invalid IP Address format')
      return
    }

    const method = editingDevice ? 'PATCH' : 'POST'
    const url = editingDevice ? `/api/devices/${editingDevice.id}` : '/api/devices'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsModalOpen(false)
        setEditingDevice(null)
        setSelectedSubnetId('')
        setAvailableIps([])
        setFormData({ name: '', macAddress: '', ipAddress: '', category: 'Server', notes: '', platform: '', status: 'active' })
        await fetchDevices()
        await fetchSubnets()
      } else {
        const err = await res.json()
        alert(err.error || 'Operation failed')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const confirmDelete = (id: string) => {
    setDeviceToDelete(id)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deviceToDelete) return
    try {
      const res = await fetch(`/api/devices/${deviceToDelete}`, { method: 'DELETE' })
      if (res.ok) {
        setIsDeleteModalOpen(false)
        setDeviceToDelete(null)
        await fetchDevices()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const openEditModal = (device: Device) => {
    setEditingDevice(device)
    setFormData({
      name: device.name,
      macAddress: device.macAddress,
      ipAddress: device.ipAddress,
      category: device.category,
      notes: device.notes || '',
      platform: device.platform || '',
      status: device.status || 'active',
    })
    // Detect which subnet this device's IP belongs to
    const matchedSubnet = subnets.find(s => {
      const base = s.prefix.split('.').slice(0, 3).join('.')
      return device.ipAddress.startsWith(base + '.')
    })
    if (matchedSubnet) {
      setSelectedSubnetId(matchedSubnet.id)
      computeAvailableIps(matchedSubnet.id)
    } else {
      setSelectedSubnetId('')
      setAvailableIps([])
    }
    setIsModalOpen(true)
  }

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.ipAddress.includes(searchTerm) ||
        d.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.platform || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory ? d.category === selectedCategory : true
      return matchesSearch && matchesCategory
    })
  }, [devices, searchTerm, selectedCategory])

  const viewTitles: Record<ViewType, string> = {
    dashboard: 'Dashboard',
    devices: 'Devices',
    ipam: 'IP Address Management',
    vlans: 'VLAN Management',
    topology: 'Network Topology',
    services: 'Services',
    changelog: 'Change Log',
  }

  const renderDevicesView = () => {
    if (!loading && devices.length === 0) {
      return (
        <div className="table-wrapper">
          <div className="empty-state">
            <Server size={40} color="#cbd5e1" />
            <h3>No devices yet</h3>
            <p>Add your first device to start managing your homelab infrastructure.</p>
            <button className="btn btn-primary" onClick={() => { setEditingDevice(null); setFormData({ name: '', macAddress: '', ipAddress: '', category: 'Server', notes: '', platform: '', status: 'active' }); setSelectedSubnetId(''); setAvailableIps([]); fetchSubnets(); setIsModalOpen(true); }}>
              <Plus size={14} /> Add Device
            </button>
          </div>
        </div>
      )
    }
    return (
    <>
      <div className="stats-ribbon">
        <div className="stat-item">
          <span className="stat-label">Total Devices</span>
          <span className="stat-value">{devices.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Networking</span>
          <span className="stat-value">{devices.filter(d => d.category === 'Networking').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">VMs & Containers</span>
          <span className="stat-value">{devices.filter(d => ['VM', 'LXC'].includes(d.category)).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active</span>
          <span className="stat-value">{devices.filter(d => d.status === 'active').length}</span>
        </div>
      </div>
      <div className="table-wrapper">
        <div className="animate-fade-in">
          <table className="unifi-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '180px' }}>Name</th>
                <th style={{ width: '120px' }}>IP Address</th>
                <th style={{ width: '160px' }}>MAC Address</th>
                <th style={{ width: '100px' }}>Category</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '140px' }}>Platform</th>
                <th style={{ width: '80px', textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', height: '100px', color: 'var(--unifi-text-muted)' }}>Loading...</td></tr>
              ) : filteredDevices.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', height: '100px', color: 'var(--unifi-text-muted)' }}>No devices match your search.</td></tr>
              ) : filteredDevices.map((device) => (
                <tr key={device.id}>
                  <td style={{ textAlign: 'center' }}>
                    {device.category === 'Networking' ? <NetIcon size={14} color="#0055ff" /> :
                     device.category === 'Server' ? <Server size={14} color="#10b981" /> :
                     device.category === 'VM' ? <Cpu size={14} color="#7c3aed" /> :
                     device.category === 'LXC' ? <Database size={14} color="#f97316" /> :
                     <Laptop size={14} color="#5e6670" />}
                  </td>
                  <td style={{ fontWeight: 500 }}>{device.name}</td>
                  <td><code style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 6px', borderRadius: '3px' }}>{device.ipAddress}</code></td>
                  <td style={{ color: '#5e6670', fontFamily: 'monospace', fontSize: '12px' }}>{device.macAddress}</td>
                  <td>
                    <span className={`badge ${
                      device.category === 'Networking' ? 'badge-blue' :
                      device.category === 'Server' ? 'badge-green' :
                      device.category === 'VM' ? 'badge-purple' : 'badge-orange'
                    }`}>{device.category}</span>
                  </td>
                  <td>
                    <span className={`status-dot ${device.status === 'active' ? 'status-active' : 'status-inactive'}`} />
                    <span style={{ fontSize: '12px' }}>{device.status}</span>
                  </td>
                  <td style={{ color: '#5e6670', fontSize: '12px' }}>{device.platform || '—'}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      <button className="btn" style={{ padding: '0 8px', border: 'none', background: 'transparent' }} onClick={() => openEditModal(device)} title="Edit"><Edit2 size={12} /></button>
                      <button className="btn" style={{ padding: '0 8px', border: 'none', background: 'transparent', color: '#ef4444' }} onClick={() => confirmDelete(device.id)} title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
  }

  return (
    <div className="app-container">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedVlanRole={selectedVlanRole}
        setSelectedVlanRole={setSelectedVlanRole}
        searchInputRef={searchInputRef}
      />

      <div className="main-content">
        <header className="top-nav">
          <div className="breadcrumbs">
            <span>Homelab Manager</span>
            <ChevronRight size={14} color="#5e6670" />
            <strong>{viewTitles[activeView]}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {activeView === 'devices' && (
              <>
                <button className="btn" onClick={exportData}><Download size={14} /> Export</button>
                <button className="btn btn-primary" onClick={() => { setEditingDevice(null); setFormData({ name: '', macAddress: '', ipAddress: '', category: 'Server', notes: '', platform: '', status: 'active' }); setSelectedSubnetId(''); setAvailableIps([]); fetchSubnets(); setIsModalOpen(true); }}>
                  <Plus size={14} /> Add Device
                </button>
              </>
            )}
          </div>
        </header>

        {activeView === 'dashboard' && <div className="table-wrapper"><DashboardView /></div>}
        {activeView === 'devices' && renderDevicesView()}
        {activeView === 'ipam' && <div className="table-wrapper"><IPPlannerView searchTerm={searchTerm} /></div>}
        {activeView === 'vlans' && <div className="table-wrapper"><VLANView searchTerm={searchTerm} selectedRole={selectedVlanRole} /></div>}
        {activeView === 'topology' && <div className="table-wrapper"><TopologyView selectedCategory={selectedCategory} /></div>}
        {activeView === 'services' && <div className="table-wrapper"><ServicesView searchTerm={searchTerm} /></div>}
        {activeView === 'changelog' && <div className="table-wrapper"><ChangelogView searchTerm={searchTerm} /></div>}
      </div>

      {/* Add/Edit Device Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>{editingDevice ? 'Edit Device' : 'Add New Device'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Device Name</label>
                <input required className="unifi-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Proxmox-Node-01" />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="unifi-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="Networking">Networking</option>
                  <option value="Server">Server</option>
                  <option value="VM">VM</option>
                  <option value="LXC">LXC</option>
                  <option value="Client">Client</option>
                  <option value="IoT">IoT</option>
                </select>
              </div>
              {subnets.length > 0 && (
                <div className="input-group">
                  <label className="input-label">{editingDevice ? 'Subnet' : 'Assign from Subnet (Optional)'}</label>
                  <select className="unifi-input" value={selectedSubnetId} onChange={e => handleSubnetChange(e.target.value)}>
                    <option value="">Manual IP entry</option>
                    {subnets.map(s => (
                      <option key={s.id} value={s.id}>{s.prefix}/{s.mask} — {s.description || 'Unnamed'} {s.vlan ? `(VLAN ${s.vlan.vid})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">IP Address</label>
                  {selectedSubnetId && availableIps.length > 0 ? (
                    <select required className="unifi-input" value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})}>
                      <option value="">Select available IP...</option>
                      {editingDevice && formData.ipAddress && (
                        <option value={formData.ipAddress}>{formData.ipAddress} (current)</option>
                      )}
                      {availableIps.slice(0, 50).map(ip => <option key={ip} value={ip}>{ip}</option>)}
                      {availableIps.length > 50 && <option disabled>...and {availableIps.length - 50} more</option>}
                    </select>
                  ) : (
                    <input required className="unifi-input" value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})} placeholder="10.0.10.x" />
                  )}
                </div>
                <div className="input-group">
                  <label className="input-label">Platform</label>
                  <input className="unifi-input" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} placeholder="e.g. Ubuntu 22.04" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">MAC Address</label>
                  <input required className="unifi-input" value={formData.macAddress} onChange={e => setFormData({...formData, macAddress: e.target.value.toUpperCase()})} placeholder="XX:XX:XX:XX:XX:XX" />
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select className="unifi-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="planned">Planned</option>
                    <option value="staged">Staged</option>
                    <option value="offline">Offline</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Notes (Optional)</label>
                <textarea className="unifi-input" style={{ height: 'auto', paddingTop: '0.5rem' }} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Purpose or description" rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDevice ? 'Apply Changes' : 'Save Device'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ background: '#fee2e2', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#dc2626' }}>
              <Trash2 size={24} />
            </div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '18px', fontWeight: 600 }}>Delete Device?</h2>
            <p style={{ color: 'var(--unifi-text-muted)', marginBottom: '2rem' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="btn btn-destructive" onClick={handleDelete}>Delete Device</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
