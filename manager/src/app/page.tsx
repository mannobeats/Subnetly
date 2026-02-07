'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Sidebar, { ViewType } from '@/components/Sidebar'
import DashboardView from '@/components/DashboardView'
import IPPlannerView from '@/components/IPPlannerView'
import VLANView from '@/components/VLANView'
import TopologyView from '@/components/TopologyView'
import ServicesView from '@/components/ServicesView'
import WiFiView from '@/components/WiFiView'
import CommandPalette from '@/components/CommandPalette'
import ChangelogView from '@/components/ChangelogView'
import SettingsView from '@/components/SettingsView'
import LoginPage from '@/components/LoginPage'
import { Plus, Trash2, Edit2, ChevronRight, Loader2, Server } from 'lucide-react'
import { Device, Site, CustomCategory } from '@/types'
import { authClient } from '@/lib/auth-client'
import { renderCategoryIcon } from '@/lib/category-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sites, setSites] = useState<Site[]>([])
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CustomCategory[]>([])
  const [vlanRoles, setVlanRoles] = useState<CustomCategory[]>([])
  const [siteKey, setSiteKey] = useState(0)

  const fetchSitesAndCategories = useCallback(async () => {
    try {
      const [sitesRes, catsRes, rolesRes] = await Promise.all([
        fetch('/api/sites').then(r => r.json()),
        fetch('/api/categories?type=device').then(r => r.json()),
        fetch('/api/categories?type=vlan_role').then(r => r.json()),
      ])
      if (sitesRes.sites) {
        setSites(sitesRes.sites)
        setActiveSiteId(sitesRes.activeSiteId || null)
      }
      if (Array.isArray(catsRes)) setCategories(catsRes)
      if (Array.isArray(rolesRes)) setVlanRoles(rolesRes)
    } catch { /* ignore */ }
  }, [])

  const handleSwitchSite = useCallback(async (siteId: string) => {
    await fetch('/api/sites/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteId }) })
    setActiveSiteId(siteId)
    await fetchSitesAndCategories()
    // Refresh all data for new site
    await fetchDevices()
    await fetchSubnets()
    // Force re-mount all child views so they re-fetch their own data
    setSiteKey(k => k + 1)
  }, [fetchSitesAndCategories])

  const handleCreateSite = useCallback(async (name: string) => {
    await fetch('/api/sites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    await fetchSitesAndCategories()
  }, [fetchSitesAndCategories])

  const checkSession = useCallback(async () => {
    try {
      const res = await authClient.getSession()
      if (res.data?.user) {
        setIsAuthenticated(true)
        setUserName(res.data.user.name || '')
        setUserEmail(res.data.user.email || '')
      } else {
        setIsAuthenticated(false)
      }
    } catch {
      setIsAuthenticated(false)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const handleLogout = async () => {
    await authClient.signOut()
    setIsAuthenticated(false)
    setUserName('')
    setUserEmail('')
  }

  // App settings from localStorage
  const [confirmDeletes, setConfirmDeletes] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const [activeView, setActiveViewRaw] = useState<ViewType>('dashboard')
  const settingsTabRef = useRef('profile')

  const setActiveView = useCallback((view: ViewType) => {
    setActiveViewRaw(view)
    if (view === 'settings') {
      window.location.hash = `settings/${settingsTabRef.current}`
    } else {
      window.location.hash = view
    }
  }, [])

  // Restore view from URL hash (or defaultView from settings) after hydration
  useEffect(() => {
    // Load app settings from localStorage
    try {
      const saved = localStorage.getItem('homelab-settings')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.confirmDeletes !== undefined) setConfirmDeletes(s.confirmDeletes)
        if (s.autoRefresh !== undefined) setAutoRefresh(s.autoRefresh)
      }
    } catch { /* ignore */ }

    const hash = window.location.hash.replace('#', '')
    const valid: ViewType[] = ['dashboard', 'devices', 'ipam', 'vlans', 'wifi', 'topology', 'services', 'changelog', 'settings']
    if (hash.startsWith('settings')) {
      setActiveViewRaw('settings')
      const sub = hash.split('/')[1]
      if (sub) {
        setSettingsTabRaw(sub)
        settingsTabRef.current = sub
      }
    } else if (valid.includes(hash as ViewType)) {
      setActiveViewRaw(hash as ViewType)
    } else {
      // No hash — use defaultView from settings
      try {
        const saved = localStorage.getItem('homelab-settings')
        if (saved) {
          const s = JSON.parse(saved)
          if (s.defaultView && valid.includes(s.defaultView as ViewType)) {
            setActiveViewRaw(s.defaultView as ViewType)
            window.location.hash = s.defaultView
          }
        }
      } catch { /* ignore */ }
    }
  }, [])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedVlanRole, setSelectedVlanRole] = useState<string | null>(null)
  const [selectedIpFilter, setSelectedIpFilter] = useState<string | null>(null)
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string | null>(null)
  const [selectedChangelogFilter, setSelectedChangelogFilter] = useState<string | null>(null)
  const [settingsTab, setSettingsTabRaw] = useState('profile')
  const setSettingsTab = useCallback((tab: string) => {
    setSettingsTabRaw(tab)
    settingsTabRef.current = tab
    window.location.hash = `settings/${tab}`
  }, [])
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchSitesAndCategories()
      fetchDevices()
      fetchSubnets()
    }
  }, [isAuthenticated, fetchSitesAndCategories])

  // Re-fetch data when switching views (respects autoRefresh setting)
  useEffect(() => {
    if (!isAuthenticated) return
    if (!autoRefresh) return
    if (activeView === 'devices') { fetchDevices(); fetchSubnets() }
    if (activeView === 'dashboard') { fetchDevices() }
  }, [activeView, isAuthenticated, autoRefresh])

  // Listen for settings changes from SettingsView (via localStorage)
  useEffect(() => {
    const onStorage = () => {
      try {
        const saved = localStorage.getItem('homelab-settings')
        if (saved) {
          const s = JSON.parse(saved)
          if (s.confirmDeletes !== undefined) setConfirmDeletes(s.confirmDeletes)
          if (s.autoRefresh !== undefined) setAutoRefresh(s.autoRefresh)
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    // Also poll for same-tab changes
    const interval = setInterval(onStorage, 2000)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval) }
  }, [])

  // Scroll to highlighted item from command palette
  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-highlight-id="${highlightId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('highlight-flash')
        setTimeout(() => el.classList.remove('highlight-flash'), 3000)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [highlightId, activeView])

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

    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeView, isModalOpen, isDeleteModalOpen, setActiveView])

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
    if (!confirmDeletes) {
      // Skip confirmation, delete directly
      setDeviceToDelete(id)
      fetch(`/api/devices/${id}`, { method: 'DELETE' }).then(res => {
        if (res.ok) { setDeviceToDelete(null); fetchDevices() }
      })
      return
    }
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
    wifi: 'WiFi Networks',
    topology: 'Network Topology',
    services: 'Services',
    changelog: 'Change Log',
    settings: 'Settings',
  }

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 text-muted-foreground">
        <Loader2 size={24} className="animate-spin" />
        <span className="text-[13px]">Loading...</span>
      </div>
    )
  }

  // Login gate
  if (!isAuthenticated) {
    return <LoginPage onLogin={() => checkSession()} />
  }

  const renderDevicesView = () => {
    if (!loading && devices.length === 0) {
      return (
        <div className="flex-1 overflow-auto p-4 px-6">
          <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-lg">
            <Server size={40} className="text-[#cbd5e1]" />
            <h3 className="text-base font-semibold mt-4 mb-2">No devices yet</h3>
            <p className="text-[13px] text-muted-foreground mb-6 max-w-[360px]">Add your first device to start managing your homelab infrastructure.</p>
            <Button onClick={() => { setEditingDevice(null); setFormData({ name: '', macAddress: '', ipAddress: '', category: 'Server', notes: '', platform: '', status: 'active' }); setSelectedSubnetId(''); setAvailableIps([]); fetchSubnets(); setIsModalOpen(true); }}>
              <Plus size={14} /> Add Device
            </Button>
          </div>
        </div>
      )
    }
    return (
    <>
      <div className="flex gap-8 px-6 py-4 bg-card border-b border-border">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">Total Devices</span>
          <span className="text-lg font-bold text-(--blue)">{devices.length}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">Networking</span>
          <span className="text-lg font-bold text-(--blue)">{devices.filter(d => d.category === 'Networking').length}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">VMs & Containers</span>
          <span className="text-lg font-bold text-(--blue)">{devices.filter(d => ['VM', 'LXC'].includes(d.category)).length}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">Active</span>
          <span className="text-lg font-bold text-(--blue)">{devices.filter(d => d.status === 'active').length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 px-6">
        <div className="animate-in fade-in duration-300 bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th className="w-[180px]">Name</th>
                <th className="w-[120px]">IP Address</th>
                <th className="w-[160px]">MAC Address</th>
                <th className="w-[100px]">Category</th>
                <th className="w-[100px]">Status</th>
                <th className="w-[140px]">Platform</th>
                <th className="w-20 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center h-[100px] text-muted-foreground">Loading...</td></tr>
              ) : filteredDevices.length === 0 ? (
                <tr><td colSpan={8} className="text-center h-[100px] text-muted-foreground">No devices match your search.</td></tr>
              ) : filteredDevices.map((device) => (
                <tr key={device.id} data-highlight-id={device.id} className={highlightId === device.id ? 'highlight-flash' : ''}>
                  <td className="text-center">
                    {(() => {
                      const cat = categories.find(c => c.name === device.category)
                      return cat ? renderCategoryIcon(cat.icon, 14, cat.color) : <Server size={14} className="text-(--text-slate)" />
                    })()}
                  </td>
                  <td className="font-medium">{device.name}</td>
                  <td><code className="text-[11px] bg-(--muted-bg) px-1.5 py-0.5 rounded">{device.ipAddress}</code></td>
                  <td className="text-(--text-slate) font-mono text-xs">{device.macAddress}</td>
                  <td>
                    {(() => {
                      const cat = categories.find(c => c.name === device.category)
                      const color = cat?.color || '#5e6670'
                      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: color + '18', color }}>{device.category}</span>
                    })()}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: device.status === 'active' ? '#22c55e' : device.status === 'offline' ? '#ef4444' : '#94a3b8' }} />
                      <span className="text-xs">{device.status}</span>
                    </div>
                  </td>
                  <td className="text-(--text-slate) text-xs">{device.platform || '—'}</td>
                  <td className="text-right pr-4">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(device)} title="Edit"><Edit2 size={12} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:text-[#ef4444]" onClick={() => confirmDelete(device.id)} title="Delete"><Trash2 size={12} /></Button>
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
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedVlanRole={selectedVlanRole}
        setSelectedVlanRole={setSelectedVlanRole}
        selectedIpFilter={selectedIpFilter}
        setSelectedIpFilter={setSelectedIpFilter}
        selectedServiceFilter={selectedServiceFilter}
        setSelectedServiceFilter={setSelectedServiceFilter}
        selectedChangelogFilter={selectedChangelogFilter}
        setSelectedChangelogFilter={setSelectedChangelogFilter}
        searchInputRef={searchInputRef}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        sites={sites}
        activeSiteId={activeSiteId}
        onSwitchSite={handleSwitchSite}
        onCreateSite={handleCreateSite}
        categories={categories}
        vlanRoles={vlanRoles}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-(--bg)">
        <header className="h-(--topnav-h) bg-(--surface) border-b border-border flex items-center px-6 justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span>Homelab Manager</span>
            <ChevronRight size={14} className="text-(--text-slate)" />
            <strong>{viewTitles[activeView]}</strong>
          </div>
          <div className="flex gap-3">
            {activeView === 'devices' && (
              <Button size="sm" onClick={() => { setEditingDevice(null); setFormData({ name: '', macAddress: '', ipAddress: '', category: 'Server', notes: '', platform: '', status: 'active' }); setSelectedSubnetId(''); setAvailableIps([]); fetchSubnets(); setIsModalOpen(true); }}>
                <Plus size={14} /> Add Device
              </Button>
            )}
          </div>
        </header>

        {activeView === 'dashboard' && <div className="flex-1 overflow-auto p-4 px-6" key={`dash-${siteKey}`}><DashboardView categories={categories} /></div>}
        {activeView === 'devices' && renderDevicesView()}
        {activeView === 'ipam' && <div className="flex-1 overflow-auto p-4 px-6" key={`ipam-${siteKey}`}><IPPlannerView searchTerm={searchTerm} selectedIpFilter={selectedIpFilter} highlightId={highlightId} /></div>}
        {activeView === 'vlans' && <div className="flex-1 overflow-auto p-4 px-6" key={`vlans-${siteKey}`}><VLANView searchTerm={searchTerm} selectedRole={selectedVlanRole} vlanRoles={vlanRoles} highlightId={highlightId} /></div>}
        {activeView === 'wifi' && <div className="flex-1 overflow-auto p-4 px-6" key={`wifi-${siteKey}`}><WiFiView searchTerm={searchTerm} selectedSecurityFilter={selectedServiceFilter} highlightId={highlightId} /></div>}
        {activeView === 'topology' && <div className="flex-1 overflow-auto p-4 px-6" key={`topo-${siteKey}`}><TopologyView selectedCategory={selectedCategory} /></div>}
        {activeView === 'services' && <div className="flex-1 overflow-auto p-4 px-6" key={`svc-${siteKey}`}><ServicesView searchTerm={searchTerm} selectedProtocol={selectedServiceFilter} highlightId={highlightId} /></div>}
        {activeView === 'changelog' && <div className="flex-1 overflow-auto p-4 px-6" key={`log-${siteKey}`}><ChangelogView searchTerm={searchTerm} selectedFilter={selectedChangelogFilter} /></div>}
        {activeView === 'settings' && <div className="flex-1 overflow-auto p-4 px-6"><SettingsView activeTab={settingsTab as 'profile' | 'security' | 'notifications' | 'application' | 'data' | 'about' | 'categories' | 'sites' | 'vlan-roles'} categories={categories} vlanRoles={vlanRoles} onCategoriesChange={fetchSitesAndCategories} sites={sites} activeSiteId={activeSiteId} onSitesChange={fetchSitesAndCategories} /></div>}
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette onNavigate={(view, itemId) => {
        setActiveView(view as ViewType)
        if (itemId) {
          setHighlightId(itemId)
          setTimeout(() => setHighlightId(null), 4000)
        }
      }} />

      {/* Add/Edit Device Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Device Name</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Proxmox-Node-01" className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Category</Label>
              <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {categories.length > 0 ? categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                )) : (
                  <>
                    <option value="Networking">Networking</option>
                    <option value="Server">Server</option>
                    <option value="VM">VM</option>
                    <option value="LXC">LXC</option>
                    <option value="Client">Client</option>
                    <option value="IoT">IoT</option>
                  </>
                )}
              </select>
            </div>
            {subnets.length > 0 && (
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{editingDevice ? 'Subnet' : 'Assign from Subnet (Optional)'}</Label>
                <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={selectedSubnetId} onChange={e => handleSubnetChange(e.target.value)}>
                  <option value="">Manual IP entry</option>
                  {subnets.map(s => (
                    <option key={s.id} value={s.id}>{s.prefix}/{s.mask} — {s.description || 'Unnamed'} {s.vlan ? `(VLAN ${s.vlan.vid})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">IP Address</Label>
                {selectedSubnetId && availableIps.length > 0 ? (
                  <select required className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})}>
                    <option value="">Select available IP...</option>
                    {editingDevice && formData.ipAddress && (
                      <option value={formData.ipAddress}>{formData.ipAddress} (current)</option>
                    )}
                    {availableIps.slice(0, 50).map(ip => <option key={ip} value={ip}>{ip}</option>)}
                    {availableIps.length > 50 && <option disabled>...and {availableIps.length - 50} more</option>}
                  </select>
                ) : (
                  <Input required value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})} placeholder="10.0.10.x" className="h-9 text-[13px]" />
                )}
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Platform</Label>
                <Input value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} placeholder="e.g. Ubuntu 22.04" className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">MAC Address</Label>
                <Input required value={formData.macAddress} onChange={e => setFormData({...formData, macAddress: e.target.value.toUpperCase()})} placeholder="XX:XX:XX:XX:XX:XX" className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Status</Label>
                <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="planned">Planned</option>
                  <option value="staged">Staged</option>
                  <option value="offline">Offline</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Notes (Optional)</Label>
              <textarea className="w-full border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 pt-2 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Purpose or description" rows={3} />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingDevice ? 'Apply Changes' : 'Save Device'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-[400px] text-center">
          <DialogHeader className="flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--red-bg-subtle) text-(--red)">
              <Trash2 size={24} />
            </div>
            <DialogTitle className="text-lg font-semibold">Delete Device?</DialogTitle>
            <DialogDescription className="mt-2">This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-4 sm:justify-center">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Device</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
