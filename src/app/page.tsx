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
import DevicesPanel from '@/components/devices/DevicesPanel'
import DeviceFormDialog, { DeviceFormData, SubnetOption } from '@/components/devices/DeviceFormDialog'
import DeviceDeleteDialog from '@/components/devices/DeviceDeleteDialog'
import LoginPage from '@/components/LoginPage'
import SetupPage from '@/components/SetupPage'
import { Plus, ChevronRight, Loader2 } from 'lucide-react'
import { Device, Site, CustomCategory } from '@/types'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

const emptyDeviceFormData: DeviceFormData = {
  name: '',
  macAddress: '',
  ipAddress: '',
  category: 'Server',
  notes: '',
  platform: '',
  status: 'active',
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupTokenRequired, setSetupTokenRequired] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sites, setSites] = useState<Site[]>([])
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CustomCategory[]>([])
  const [vlanRoles, setVlanRoles] = useState<CustomCategory[]>([])
  const [deviceStatuses, setDeviceStatuses] = useState<CustomCategory[]>([])
  const [vlanStatuses, setVlanStatuses] = useState<CustomCategory[]>([])
  const [serviceProtocols, setServiceProtocols] = useState<CustomCategory[]>([])
  const [serviceEnvironments, setServiceEnvironments] = useState<CustomCategory[]>([])
  const [serviceHealthStatuses, setServiceHealthStatuses] = useState<CustomCategory[]>([])
  const [wifiSecurities, setWifiSecurities] = useState<CustomCategory[]>([])
  const [subnetRoles, setSubnetRoles] = useState<CustomCategory[]>([])
  const [ipRangeRoles, setIpRangeRoles] = useState<CustomCategory[]>([])
  const [ipAddressTypes, setIpAddressTypes] = useState<CustomCategory[]>([])
  const [siteKey, setSiteKey] = useState(0)

  const fetchSitesAndCategories = useCallback(async () => {
    try {
      const [sitesRes, catsRes, rolesRes, deviceStatusRes, vlanStatusRes, protocolRes, envRes, healthRes, wifiSecurityRes, subnetRoleRes, ipRangeRoleRes, ipAddressTypeRes] = await Promise.all([
        fetch('/api/sites').then(r => r.json()),
        fetch('/api/categories?type=device').then(r => r.json()),
        fetch('/api/categories?type=vlan_role').then(r => r.json()),
        fetch('/api/categories?type=device_status').then(r => r.json()),
        fetch('/api/categories?type=vlan_status').then(r => r.json()),
        fetch('/api/categories?type=service_protocol').then(r => r.json()),
        fetch('/api/categories?type=service_environment').then(r => r.json()),
        fetch('/api/categories?type=service_health').then(r => r.json()),
        fetch('/api/categories?type=wifi_security').then(r => r.json()),
        fetch('/api/categories?type=subnet_role').then(r => r.json()),
        fetch('/api/categories?type=ip_range_role').then(r => r.json()),
        fetch('/api/categories?type=ip_address_type').then(r => r.json()),
      ])
      if (sitesRes.sites) {
        setSites(sitesRes.sites)
        setActiveSiteId(sitesRes.activeSiteId || null)
      }
      if (Array.isArray(catsRes)) setCategories(catsRes)
      if (Array.isArray(rolesRes)) setVlanRoles(rolesRes)
      if (Array.isArray(deviceStatusRes)) setDeviceStatuses(deviceStatusRes)
      if (Array.isArray(vlanStatusRes)) setVlanStatuses(vlanStatusRes)
      if (Array.isArray(protocolRes)) setServiceProtocols(protocolRes)
      if (Array.isArray(envRes)) setServiceEnvironments(envRes)
      if (Array.isArray(healthRes)) setServiceHealthStatuses(healthRes)
      if (Array.isArray(wifiSecurityRes)) setWifiSecurities(wifiSecurityRes)
      if (Array.isArray(subnetRoleRes)) setSubnetRoles(subnetRoleRes)
      if (Array.isArray(ipRangeRoleRes)) setIpRangeRoles(ipRangeRoleRes)
      if (Array.isArray(ipAddressTypeRes)) setIpAddressTypes(ipAddressTypeRes)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setNeedsSetup(false)
        setSetupTokenRequired(false)
        setUserName(res.data.user.name || '')
        setUserEmail(res.data.user.email || '')
      } else {
        setIsAuthenticated(false)
        try {
          const setupRes = await fetch('/api/auth/setup')
          if (setupRes.ok) {
            const setupData = await setupRes.json()
            setNeedsSetup(Boolean(setupData.needsSetup))
            setSetupTokenRequired(Boolean(setupData.setupTokenRequired))
          } else {
            setNeedsSetup(false)
            setSetupTokenRequired(false)
          }
        } catch {
          setNeedsSetup(false)
          setSetupTokenRequired(false)
        }
      }
    } catch {
      setIsAuthenticated(false)
      setNeedsSetup(false)
      setSetupTokenRequired(false)
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
  const APP_SETTINGS_KEY = 'subnetly-settings'
  const LEGACY_APP_SETTINGS_KEY = 'homelab-settings'

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
      const saved = localStorage.getItem(APP_SETTINGS_KEY) ?? localStorage.getItem(LEGACY_APP_SETTINGS_KEY)
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
        const saved = localStorage.getItem(APP_SETTINGS_KEY) ?? localStorage.getItem(LEGACY_APP_SETTINGS_KEY)
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

  const [formData, setFormData] = useState<DeviceFormData>(emptyDeviceFormData)

  useEffect(() => {
    if (isAuthenticated) {
      fetchSitesAndCategories()
      fetchDevices()
      fetchSubnets()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, fetchSitesAndCategories])

  // Re-fetch data when switching views (respects autoRefresh setting)
  useEffect(() => {
    if (!isAuthenticated) return
    if (!autoRefresh) return
    if (activeView === 'devices') { fetchDevices(); fetchSubnets() }
    if (activeView === 'dashboard') { fetchDevices() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, isAuthenticated, autoRefresh])

  // Listen for settings changes from SettingsView (via localStorage)
  useEffect(() => {
    const onStorage = () => {
      try {
        const saved = localStorage.getItem(APP_SETTINGS_KEY) ?? localStorage.getItem(LEGACY_APP_SETTINGS_KEY)
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
          openCreateDeviceModal()
        }
        return
      }

    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchSubnets = useCallback(async () => {
    try {
      const res = await fetch('/api/subnets')
      const data = await res.json()
      setSubnets(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

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

  const openCreateDeviceModal = useCallback(() => {
    setEditingDevice(null)
    setFormData(emptyDeviceFormData)
    setSelectedSubnetId('')
    setAvailableIps([])
    fetchSubnets()
    setIsModalOpen(true)
  }, [fetchSubnets])

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
        setFormData(emptyDeviceFormData)
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
    if (needsSetup) {
      return <SetupPage setupTokenRequired={setupTokenRequired} onSetupComplete={() => checkSession()} />
    }
    return <LoginPage onLogin={() => checkSession()} />
  }

  const renderDevicesView = () => {
    return (
      <DevicesPanel
        loading={loading}
        devices={devices}
        filteredDevices={filteredDevices}
        categories={categories}
        highlightId={highlightId}
        onAddDevice={openCreateDeviceModal}
        onEditDevice={openEditModal}
        onDeleteDevice={confirmDelete}
      />
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
        serviceProtocols={serviceProtocols}
        wifiSecurities={wifiSecurities}
        ipAddressTypes={ipAddressTypes}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-(--bg)">
        <header className="h-(--topnav-h) bg-(--surface) border-b border-border flex items-center px-6 justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span>Subnetly</span>
            <ChevronRight size={14} className="text-(--text-slate)" />
            <strong>{viewTitles[activeView]}</strong>
          </div>
          <div className="flex gap-3">
            {activeView === 'devices' && (
              <Button size="sm" onClick={openCreateDeviceModal}>
                <Plus size={14} /> Add Device
              </Button>
            )}
          </div>
        </header>

        {activeView === 'dashboard' && <div className="flex-1 overflow-auto p-4 px-6" key={`dash-${siteKey}`}><DashboardView categories={categories} /></div>}
        {activeView === 'devices' && renderDevicesView()}
        {activeView === 'ipam' && <div className="flex-1 overflow-auto p-4 px-6" key={`ipam-${siteKey}`}><IPPlannerView searchTerm={searchTerm} selectedIpFilter={selectedIpFilter} onPlatformOptionsChange={fetchSitesAndCategories} /></div>}
        {activeView === 'vlans' && <div className="flex-1 overflow-auto p-4 px-6" key={`vlans-${siteKey}`}><VLANView searchTerm={searchTerm} selectedRole={selectedVlanRole} vlanRoles={vlanRoles} vlanStatuses={vlanStatuses} highlightId={highlightId} /></div>}
        {activeView === 'wifi' && <div className="flex-1 overflow-auto p-4 px-6" key={`wifi-${siteKey}`}><WiFiView searchTerm={searchTerm} selectedSecurityFilter={selectedServiceFilter} securityOptions={wifiSecurities} highlightId={highlightId} /></div>}
        {activeView === 'topology' && <div className="flex-1 overflow-auto p-4 px-6" key={`topo-${siteKey}`}><TopologyView selectedCategory={selectedCategory} /></div>}
        {activeView === 'services' && <div className="flex-1 overflow-auto p-4 px-6" key={`svc-${siteKey}`}><ServicesView searchTerm={searchTerm} selectedProtocol={selectedServiceFilter} protocolOptions={serviceProtocols} environmentOptions={serviceEnvironments} healthStatusOptions={serviceHealthStatuses} highlightId={highlightId} /></div>}
        {activeView === 'changelog' && <div className="flex-1 overflow-auto p-4 px-6" key={`log-${siteKey}`}><ChangelogView searchTerm={searchTerm} selectedFilter={selectedChangelogFilter} /></div>}
        {activeView === 'settings' && <div className="flex-1 overflow-auto p-4 px-6"><SettingsView activeTab={settingsTab as 'profile' | 'security' | 'notifications' | 'application' | 'data' | 'about' | 'categories' | 'sites' | 'vlan-roles' | 'platform-options'} categories={categories} vlanRoles={vlanRoles} platformOptions={{ deviceStatuses, vlanStatuses, serviceProtocols, serviceEnvironments, serviceHealthStatuses, wifiSecurities, subnetRoles, ipRangeRoles, ipAddressTypes }} onCategoriesChange={fetchSitesAndCategories} sites={sites} activeSiteId={activeSiteId} onSitesChange={fetchSitesAndCategories} /></div>}
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette onNavigate={(view, itemId) => {
        setActiveView(view as ViewType)
        if (itemId) {
          setHighlightId(itemId)
          setTimeout(() => setHighlightId(null), 4000)
        }
      }} />

      <DeviceFormDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingDevice={editingDevice}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        deviceStatuses={deviceStatuses}
        subnets={subnets}
        selectedSubnetId={selectedSubnetId}
        availableIps={availableIps}
        onSubnetChange={handleSubnetChange}
        onSubmit={handleSubmit}
      />

      <DeviceDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDelete}
      />
    </div>
  )
}
