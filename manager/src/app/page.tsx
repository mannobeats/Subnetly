'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { Plus, Search, Filter, Download, MoreVertical, Trash2, Edit2, Cpu, Activity, Database, Globe } from 'lucide-react'
import { Device } from '@/types'

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)

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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(devices, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "homelab_ips.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ipAddress.includes(searchTerm) ||
    d.macAddress.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = [
    { label: 'Total Devices', value: devices.length, icon: <Activity />, color: '#0066ff' },
    { label: 'VMs & Containers', value: devices.filter(d => ['VM', 'LXC'].includes(d.category)).length, icon: <Cpu />, color: '#7c3aed' },
    { label: 'Infrastructure', value: devices.filter(d => ['Networking', 'Server'].includes(d.category)).length, icon: <Database />, color: '#10b981' },
    { label: 'Active Subnet', value: '10.0.10.x', icon: <Globe />, color: '#f59e0b' }
  ]

  return (
    <main style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <Sidebar />
      
      <div style={{ flex: 1, padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Network Overview</h1>
            <p style={{ color: 'var(--secondary-foreground)', marginTop: '0.25rem' }}>Manage your homelab IP allocations and infrastructure.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={exportData}>
              <Download size={18} /> Export
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingDevice(null); setIsModalOpen(true); }}>
              <Plus size={18} /> Add Device
            </button>
          </div>
        </header>

        <div className="status-grid">
          {stats.map((stat, i) => (
            <div key={i} className="card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', animationDelay: `${i * 0.1}s` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--secondary-foreground)' }}>{stat.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-foreground)' }} size={18} />
              <input 
                type="text" 
                className="input" 
                placeholder="Search by name, IP or MAC..." 
                style={{ paddingLeft: '2.5rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary"><Filter size={18} /> Filter</button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>Loading devices...</td></tr>
                ) : filteredDevices.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>No devices found. Click "Add Device" to get started.</td></tr>
                ) : filteredDevices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{device.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--secondary-foreground)' }}>{new Date(device.updatedAt).toLocaleDateString()}</div>
                    </td>
                    <td><code style={{ background: 'var(--secondary)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{device.ipAddress}</code></td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--secondary-foreground)' }}>{device.macAddress}</td>
                    <td>
                      <span className="badge" style={{ 
                        background: device.category === 'Networking' ? '#e0f2fe' : device.category === 'Server' ? '#f0fdf4' : device.category === 'VM' ? '#faf5ff' : '#fff7ed',
                        color: device.category === 'Networking' ? '#0369a1' : device.category === 'Server' ? '#15803d' : device.category === 'VM' ? '#7e22ce' : '#c2410c'
                      }}>
                        {device.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => openEditModal(device)}><Edit2 size={14} /></button>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => deleteDevice(device.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>{editingDevice ? 'Edit Device' : 'Add New Device'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Device Name</label>
                <input required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Proxmox-Node-01" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>IP Address</label>
                  <input required className="input" value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})} placeholder="10.0.10.x" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Category</label>
                  <select className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Networking</option>
                    <option>Server</option>
                    <option>VM</option>
                    <option>LXC</option>
                    <option>Client</option>
                    <option>IoT</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>MAC Address</label>
                <input required className="input" value={formData.macAddress} onChange={e => setFormData({...formData, macAddress: e.target.value})} placeholder="XX:XX:XX:XX:XX:XX" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Notes (Optional)</label>
                <textarea className="input" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Purpose of this device..." rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingDevice ? 'Update' : 'Save Device'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
