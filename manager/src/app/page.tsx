'use client'

import { useState, useEffect, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import { Plus, Download, Trash2, Edit2, Network as NetIcon, ChevronRight, LayoutGrid, List, Laptop } from 'lucide-react'
import { Device } from '@/types'

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'planner'>('table')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    macAddress: '',
    ipAddress: '',
    category: 'Server',
    notes: ''
  })

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setFormData({ name: '', macAddress: '', ipAddress: '', category: 'Server', notes: '' })
        fetchDevices()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const deleteDevice = async (id: string) => {
    if (confirm('Are you sure you want to delete this device?')) {
      try {
        await fetch(`/api/devices/${id}`, { method: 'DELETE' })
        fetchDevices()
      } catch (err) {
        console.error(err)
      }
    }
  }

  const openEditModal = (device: Device) => {
    setEditingDevice(device)
    setFormData({
      name: device.name,
      macAddress: device.macAddress,
      ipAddress: device.ipAddress,
      category: device.category,
      notes: device.notes || ''
    })
    setIsModalOpen(true)
  }

  const exportData = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(devices, null, 2))
      const downloadAnchorNode = document.createElement('a')
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", "homelab_net_plan.json")
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const filteredDevices = useMemo(() => {
    return devices.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.ipAddress.includes(searchTerm) ||
      d.macAddress.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [devices, searchTerm])

  const stats = useMemo(() => [
    { label: 'Total Clients', value: devices.length },
    { label: 'Networking', value: devices.filter(d => d.category === 'Networking').length },
    { label: 'VMs & Containers', value: devices.filter(d => ['VM', 'LXC'].includes(d.category)).length },
    { label: 'Active Subnet', value: '10.0.10.0/24' }
  ], [devices])

  // IP Planner Cells (0-255)
  const ipPlannerCells = useMemo(() => {
    const cells = []
    const occupiedIps = new Set(devices.map(d => parseInt(d.ipAddress.split('.').pop() || '0')))
    
    for (let i = 0; i < 256; i++) {
      const isOccupied = occupiedIps.has(i)
      const isGateway = i === 1
      cells.push({
        num: i,
        status: isGateway ? 'gateway' : isOccupied ? 'occupied' : 'empty',
        device: devices.find(d => parseInt(d.ipAddress.split('.').pop() || '0') === i)
      })
    }
    return cells
  }, [devices])

  return (
    <div className="app-container">
      <Sidebar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      
      <div className="main-content">
        <header className="top-nav">
          <div className="breadcrumbs">
            <span>Portland</span>
            <ChevronRight size={14} color="#5e6670" />
            <strong>Network</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="btn" onClick={() => setViewMode(viewMode === 'table' ? 'planner' : 'table')}>
              {viewMode === 'table' ? <LayoutGrid size={14} /> : <List size={14} />}
              {viewMode === 'table' ? 'IP Planner' : 'Client List'}
            </div>
            <button className="btn" onClick={exportData}><Download size={14} /> Export</button>
            <button className="btn btn-primary" onClick={() => { setEditingDevice(null); setIsModalOpen(true); }}>
              <Plus size={14} /> Add Device
            </button>
          </div>
        </header>

        <div className="stats-ribbon">
          {stats.map((stat, i) => (
            <div key={i} className="stat-item">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-value">{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="table-wrapper">
          {viewMode === 'table' ? (
            <div className="animate-fade-in">
              <table className="unifi-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th style={{ width: '200px' }}>Name</th>
                    <th style={{ width: '120px' }}>IP Address</th>
                    <th style={{ width: '150px' }}>MAC Address</th>
                    <th style={{ width: '120px' }}>Category</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', height: '100px' }}>Loading devices...</td></tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', height: '100px' }}>No devices found.</td></tr>
                  ) : filteredDevices.map((device) => (
                    <tr key={device.id}>
                      <td style={{ textAlign: 'center' }}>
                        {device.category === 'Networking' ? <NetIcon size={14} color="#0055ff" /> : <Laptop size={14} color="#5e6670" />}
                      </td>
                      <td style={{ fontWeight: 500 }}>{device.name}</td>
                      <td><code style={{ fontSize: '11px', background: '#f1f3f5', padding: '2px 4px', borderRadius: '3px' }}>{device.ipAddress}</code></td>
                      <td style={{ color: '#5e6670', fontFamily: 'monospace' }}>{device.macAddress}</td>
                      <td>
                        <span className={`badge ${
                          device.category === 'Networking' ? 'badge-blue' : 
                          device.category === 'Server' ? 'badge-green' : 
                          device.category === 'VM' ? 'badge-purple' : 'badge-orange'
                        }`}>
                          {device.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn" style={{ padding: '0 6px', border: 'none' }} onClick={() => openEditModal(device)}><Edit2 size={12} /></button>
                          <button className="btn" style={{ padding: '0 6px', border: 'none', color: '#ef4444' }} onClick={() => deleteDevice(device.id)}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>Subnet 10.0.10.x Map</h2>
              <div className="ip-grid">
                {ipPlannerCells.map((cell) => (
                  <div 
                    key={cell.num} 
                    className={`ip-cell ${cell.status}`}
                    title={cell.device ? `${cell.device.name} (${cell.device.ipAddress})` : `. ${cell.num}`}
                  >
                    {cell.num}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', fontSize: '11px', color: '#5e6670' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} /> Gateway (.1)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#0055ff', borderRadius: '2px' }} /> Occupied
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#f1f3f5', borderRadius: '2px' }} /> Available
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '16px', fontWeight: 600 }}>{editingDevice ? 'Edit Device' : 'Add New Device'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Device Name</label>
                <input required className="unifi-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Proxmox-Node-01" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">IP Address</label>
                  <input required className="unifi-input" value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})} placeholder="10.0.10.x" />
                </div>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select className="unifi-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Networking</option>
                    <option>Server</option>
                    <option>VM</option>
                    <option>LXC</option>
                    <option>Client</option>
                    <option>IoT</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">MAC Address</label>
                <input required className="unifi-input" value={formData.macAddress} onChange={e => setFormData({...formData, macAddress: e.target.value})} placeholder="XX:XX:XX:XX:XX:XX" />
              </div>
              <div className="input-group">
                <label className="input-label">Notes (Optional)</label>
                <textarea className="unifi-input" style={{ height: 'auto', paddingTop: '0.5rem' }} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Purpose" rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDevice ? 'Apply Changes' : 'Save Device'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
