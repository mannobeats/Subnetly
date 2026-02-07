'use client'

import { 
  LayoutDashboard, Server, Network, Globe, Share2,
  Box, History, Settings, Search, Database, 
  Wifi, Command, LogOut, User, Lock, Bell, Shield,
  MapPin, Plus, ChevronDown, Tag
} from 'lucide-react'
import { RefObject, useState, useRef, useEffect } from 'react'
import { Site, CustomCategory } from '@/types'
import { getCategoryIcon } from '@/lib/category-icons'

export type ViewType = 'dashboard' | 'devices' | 'ipam' | 'vlans' | 'wifi' | 'topology' | 'services' | 'changelog' | 'settings'

interface SidebarProps {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  searchTerm: string
  setSearchTerm: (value: string) => void
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
  selectedVlanRole: string | null
  setSelectedVlanRole: (role: string | null) => void
  selectedIpFilter: string | null
  setSelectedIpFilter: (filter: string | null) => void
  selectedServiceFilter: string | null
  setSelectedServiceFilter: (filter: string | null) => void
  selectedChangelogFilter: string | null
  setSelectedChangelogFilter: (filter: string | null) => void
  searchInputRef?: RefObject<HTMLInputElement | null>
  userName?: string
  userEmail?: string
  onLogout?: () => void
  settingsTab?: string
  setSettingsTab?: (tab: string) => void
  sites?: Site[]
  activeSiteId?: string | null
  onSwitchSite?: (siteId: string) => void
  onCreateSite?: (name: string) => void
  categories?: CustomCategory[]
  vlanRoles?: CustomCategory[]
}

const navItems: { id: ViewType; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'devices', icon: Server, label: 'Devices' },
  { id: 'ipam', icon: Globe, label: 'IP Planner' },
  { id: 'vlans', icon: Network, label: 'VLANs' },
  { id: 'wifi', icon: Wifi, label: 'WiFi' },
  { id: 'topology', icon: Share2, label: 'Topology' },
  { id: 'services', icon: Box, label: 'Services' },
  { id: 'changelog', icon: History, label: 'Changelog' },
]

const Sidebar = ({ activeView, setActiveView, searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, selectedVlanRole, setSelectedVlanRole, selectedIpFilter, setSelectedIpFilter, selectedServiceFilter, setSelectedServiceFilter, selectedChangelogFilter, setSelectedChangelogFilter, searchInputRef, userName, userEmail, onLogout, settingsTab, setSettingsTab, sites = [], activeSiteId, onSwitchSite, onCreateSite, categories = [], vlanRoles = [] }: SidebarProps) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [siteMenuOpen, setSiteMenuOpen] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const userMenuRef = useRef<HTMLDivElement>(null)
  const siteMenuRef = useRef<HTMLDivElement>(null)

  const activeSite = sites.find(s => s.id === activeSiteId)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (siteMenuRef.current && !siteMenuRef.current.contains(e.target as Node)) {
        setSiteMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = userName ? userName.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'
  return (
    <>
      {/* Primary Sidebar - Icons Only */}
      <div className="sidebar-primary">
        <div className="sidebar-logo">
          <Wifi size={22} strokeWidth={2.5} />
        </div>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-icon ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
            title={item.label}
          >
            <item.icon size={18} />
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div
          className={`sidebar-icon ${activeView === 'settings' ? 'active' : ''}`}
          title="Settings"
          onClick={() => setActiveView('settings')}
        >
          <Settings size={18} />
        </div>
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            className="user-menu-trigger"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            title={userName || 'User'}
          >
            {initials}
          </button>
          {userMenuOpen && (
            <div className="user-menu-dropdown animate-fade-in">
              <div className="user-menu-header">
                <div className="user-menu-name">{userName || 'User'}</div>
                <div className="user-menu-email">{userEmail || ''}</div>
              </div>
              <button className="user-menu-item" onClick={() => { setActiveView('settings'); setUserMenuOpen(false) }}>
                <User size={14} /> Profile
              </button>
              <button className="user-menu-item" onClick={() => { setActiveView('settings'); setUserMenuOpen(false) }}>
                <Settings size={14} /> Settings
              </button>
              <div className="user-menu-divider" />
              <button className="user-menu-item danger" onClick={() => { setUserMenuOpen(false); onLogout?.() }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Sidebar - Context Panel */}
      <div className="sidebar-secondary">
        {/* Site Switcher */}
        {sites.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '1rem' }} ref={siteMenuRef}>
            <button
              className="site-switcher-btn"
              onClick={() => setSiteMenuOpen(!siteMenuOpen)}
            >
              <MapPin size={14} />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeSite?.name || 'Select Site'}
              </span>
              <ChevronDown size={12} style={{ opacity: 0.5, transform: siteMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {siteMenuOpen && (
              <div className="site-switcher-dropdown animate-fade-in">
                {sites.map(s => (
                  <button
                    key={s.id}
                    className={`site-switcher-item ${s.id === activeSiteId ? 'active' : ''}`}
                    onClick={() => { onSwitchSite?.(s.id); setSiteMenuOpen(false) }}
                  >
                    <MapPin size={12} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      {s._count && <div style={{ fontSize: '10px', color: 'var(--text-light)' }}>{s._count.devices} devices · {s._count.subnets} subnets</div>}
                    </div>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', margin: '0.25rem 0', padding: '0.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                      className="unifi-input"
                      style={{ height: '28px', fontSize: '11px', flex: 1 }}
                      placeholder="New site name..."
                      value={newSiteName}
                      onChange={e => setNewSiteName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSiteName.trim()) {
                          onCreateSite?.(newSiteName.trim())
                          setNewSiteName('')
                          setSiteMenuOpen(false)
                        }
                      }}
                    />
                    <button
                      className="btn btn-primary"
                      style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                      disabled={!newSiteName.trim()}
                      onClick={() => {
                        if (newSiteName.trim()) {
                          onCreateSite?.(newSiteName.trim())
                          setNewSiteName('')
                          setSiteMenuOpen(false)
                        }
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="sidebar-section-title">{activeView === 'settings' ? 'Settings' : navItems.find(n => n.id === activeView)?.label}</div>
        
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--unifi-text-muted)' }} size={14} />
          <input 
            ref={searchInputRef}
            type="text" 
            className="unifi-input" 
            placeholder="Search..." 
            style={{ paddingLeft: '2rem', paddingRight: '2.5rem', height: '32px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {!searchTerm && (
            <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '2px', color: '#94a3b8', fontSize: '10px', pointerEvents: 'none' }}>
              <Command size={10} /> K
            </span>
          )}
        </div>

        {activeView === 'devices' && (
          <>
            <h3>Filters</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedCategory === null ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(null)}>
                <Server size={14} color={selectedCategory === null ? '#0055ff' : '#5e6670'} /> <span>All Devices</span>
              </div>
            </div>
            <h3>Categories</h3>
            <div className="filter-list">
              {categories.length > 0 ? categories.map(cat => {
                const Icon = getCategoryIcon(cat.icon)
                return (
                  <div key={cat.id} className={`filter-item ${selectedCategory === cat.name ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}>
                    <Icon size={14} color={selectedCategory === cat.name ? '#0055ff' : cat.color} /> <span>{cat.name}</span>
                  </div>
                )
              }) : (
                <>
                  <div className={`filter-item ${selectedCategory === 'Server' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory('Server')}>
                    <Server size={14} color={selectedCategory === 'Server' ? '#0055ff' : '#5e6670'} /> <span>Servers</span>
                  </div>
                  <div className={`filter-item ${selectedCategory === 'Networking' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory('Networking')}>
                    <Network size={14} color={selectedCategory === 'Networking' ? '#0055ff' : '#5e6670'} /> <span>Networking</span>
                  </div>
                </>
              )}
            </div>
            {categories.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="filter-item" style={{ fontSize: '11px', color: 'var(--text-light)' }} onClick={() => { setSettingsTab?.('categories'); setActiveView('settings') }}>
                  <Tag size={12} /> <span>Manage Categories</span>
                </div>
              </div>
            )}
          </>
        )}

        {activeView === 'dashboard' && (
          <>
            <h3>Quick Navigation</h3>
            <div className="filter-list">
              <div className="filter-item" onClick={() => setActiveView('devices')}><Server size={14} color="#5e6670" /> <span>Devices</span></div>
              <div className="filter-item" onClick={() => setActiveView('ipam')}><Globe size={14} color="#5e6670" /> <span>IP Planner</span></div>
              <div className="filter-item" onClick={() => setActiveView('vlans')}><Network size={14} color="#5e6670" /> <span>VLANs</span></div>
              <div className="filter-item" onClick={() => setActiveView('topology')}><Share2 size={14} color="#5e6670" /> <span>Topology</span></div>
            </div>
          </>
        )}

        {activeView === 'ipam' && (
          <>
            <h3>Filters</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedIpFilter === null ? 'active-filter' : ''}`} onClick={() => setSelectedIpFilter(null)}>
                <Globe size={14} color={selectedIpFilter === null ? '#0055ff' : '#5e6670'} /> <span>All Addresses</span>
              </div>
            </div>
            <h3>Address Types</h3>
            <div className="filter-list">
              <div className={`filter-item ${selectedIpFilter === 'gateway' ? 'active-filter' : ''}`} onClick={() => setSelectedIpFilter(selectedIpFilter === 'gateway' ? null : 'gateway')}><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Gateway</span></div>
              <div className={`filter-item ${selectedIpFilter === 'assigned' ? 'active-filter' : ''}`} onClick={() => setSelectedIpFilter(selectedIpFilter === 'assigned' ? null : 'assigned')}><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Assigned</span></div>
              <div className={`filter-item ${selectedIpFilter === 'dhcp' ? 'active-filter' : ''}`} onClick={() => setSelectedIpFilter(selectedIpFilter === 'dhcp' ? null : 'dhcp')}><div className="legend-dot" style={{ background: '#f59e0b' }} /> <span>DHCP Pool</span></div>
              <div className={`filter-item ${selectedIpFilter === 'reserved' ? 'active-filter' : ''}`} onClick={() => setSelectedIpFilter(selectedIpFilter === 'reserved' ? null : 'reserved')}><div className="legend-dot" style={{ background: '#8b5cf6' }} /> <span>Reserved</span></div>
              <div className={`filter-item ${selectedIpFilter === 'infrastructure' ? 'active-filter' : ''}`} onClick={() => setSelectedIpFilter(selectedIpFilter === 'infrastructure' ? null : 'infrastructure')}><div className="legend-dot" style={{ background: '#06b6d4' }} /> <span>Infrastructure</span></div>
              <div className={`filter-item ${selectedIpFilter === 'available' ? 'active-filter' : ''}`} onClick={() => setSelectedIpFilter(selectedIpFilter === 'available' ? null : 'available')}><div className="legend-dot" style={{ background: '#f1f3f5', border: '1px solid #dee2e6' }} /> <span>Available</span></div>
            </div>
          </>
        )}

        {activeView === 'topology' && (
          <>
            <h3>Filters</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedCategory === null ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(null)}>
                <Share2 size={14} color={selectedCategory === null ? '#0055ff' : '#5e6670'} /> <span>All Devices</span>
              </div>
            </div>
            <h3>Device Types</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              {categories.length > 0 ? categories.map(cat => (
                <div key={cat.id} className={`filter-item ${selectedCategory === cat.name ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}>
                  <div className="legend-dot" style={{ background: cat.color }} /> <span>{cat.name}</span>
                </div>
              )) : (
                <>
                  <div className={`filter-item ${selectedCategory === 'Server' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'Server' ? null : 'Server')}><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Server</span></div>
                  <div className={`filter-item ${selectedCategory === 'Networking' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'Networking' ? null : 'Networking')}><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Networking</span></div>
                </>
              )}
            </div>
            <h3>Controls</h3>
            <div className="filter-list">
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>Scroll</span> <span>Zoom in/out</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>Drag</span> <span>Pan canvas</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>Drag node</span> <span>Move device</span></div>
            </div>
          </>
        )}

        {activeView === 'wifi' && (
          <>
            <h3>Filters</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedServiceFilter === null ? 'active-filter' : ''}`} onClick={() => setSelectedServiceFilter(null)}>
                <Wifi size={14} color={selectedServiceFilter === null ? '#0055ff' : '#5e6670'} /> <span>All Networks</span>
              </div>
            </div>
            <h3>Security</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedServiceFilter === 'wpa2' ? 'active-filter' : ''}`} onClick={() => setSelectedServiceFilter(selectedServiceFilter === 'wpa2' ? null : 'wpa2')}><Lock size={14} color={selectedServiceFilter === 'wpa2' ? '#0055ff' : '#5e6670'} /> <span>WPA2</span></div>
              <div className={`filter-item ${selectedServiceFilter === 'wpa3' ? 'active-filter' : ''}`} onClick={() => setSelectedServiceFilter(selectedServiceFilter === 'wpa3' ? null : 'wpa3')}><Shield size={14} color={selectedServiceFilter === 'wpa3' ? '#0055ff' : '#5e6670'} /> <span>WPA3</span></div>
              <div className={`filter-item ${selectedServiceFilter === 'open' ? 'active-filter' : ''}`} onClick={() => setSelectedServiceFilter(selectedServiceFilter === 'open' ? null : 'open')}><Wifi size={14} color={selectedServiceFilter === 'open' ? '#0055ff' : '#5e6670'} /> <span>Open</span></div>
            </div>
            <h3>Band</h3>
            <div className="filter-list">
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>2.4 GHz</span> <span>Legacy devices</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>5 GHz</span> <span>High speed</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>6 GHz</span> <span>WiFi 6E</span></div>
            </div>
          </>
        )}

        {activeView === 'services' && (
          <>
            <h3>Filters</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedServiceFilter === null ? 'active-filter' : ''}`} onClick={() => setSelectedServiceFilter(null)}>
                <Wifi size={14} color={selectedServiceFilter === null ? '#0055ff' : '#5e6670'} /> <span>All Services</span>
              </div>
            </div>
            <h3>Protocol</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedServiceFilter === 'tcp' ? 'active-filter' : ''}`} onClick={() => setSelectedServiceFilter(selectedServiceFilter === 'tcp' ? null : 'tcp')}><Globe size={14} color={selectedServiceFilter === 'tcp' ? '#0055ff' : '#5e6670'} /> <span>TCP</span></div>
              <div className={`filter-item ${selectedServiceFilter === 'udp' ? 'active-filter' : ''}`} onClick={() => setSelectedServiceFilter(selectedServiceFilter === 'udp' ? null : 'udp')}><Globe size={14} color={selectedServiceFilter === 'udp' ? '#0055ff' : '#5e6670'} /> <span>UDP</span></div>
            </div>
            <h3>Common Ports</h3>
            <div className="filter-list">
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>80/443</span> <span>HTTP/HTTPS</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>22</span> <span>SSH</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>53</span> <span>DNS</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>3306</span> <span>MySQL</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>5432</span> <span>PostgreSQL</span></div>
            </div>
          </>
        )}

        {activeView === 'vlans' && (
          <>
            <h3>Filters</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedVlanRole === null ? 'active-filter' : ''}`} onClick={() => setSelectedVlanRole(null)}>
                <Network size={14} color={selectedVlanRole === null ? '#0055ff' : '#5e6670'} /> <span>All VLANs</span>
              </div>
            </div>
            <h3>VLAN Roles</h3>
            <div className="filter-list">
              {vlanRoles.length > 0 ? vlanRoles.map(role => (
                <div key={role.id} className={`filter-item ${selectedVlanRole === role.slug ? 'active-filter' : ''}`} onClick={() => setSelectedVlanRole(selectedVlanRole === role.slug ? null : role.slug)}>
                  <div className="legend-dot" style={{ background: role.color }} /> <span>{role.name}</span>
                </div>
              )) : (
                <>
                  <div className={`filter-item ${selectedVlanRole === 'management' ? 'active-filter' : ''}`} onClick={() => setSelectedVlanRole(selectedVlanRole === 'management' ? null : 'management')}><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Management</span></div>
                  <div className={`filter-item ${selectedVlanRole === 'production' ? 'active-filter' : ''}`} onClick={() => setSelectedVlanRole(selectedVlanRole === 'production' ? null : 'production')}><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Production</span></div>
                </>
              )}
            </div>
            {vlanRoles.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="filter-item" style={{ fontSize: '11px', color: 'var(--text-light)' }} onClick={() => { setSettingsTab?.('vlan-roles'); setActiveView('settings') }}>
                  <Tag size={12} /> <span>Manage Roles</span>
                </div>
              </div>
            )}
          </>
        )}
        {activeView === 'settings' && (
          <>
            <h3>Account</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${settingsTab === 'profile' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('profile')}>
                <User size={14} color={settingsTab === 'profile' ? '#0055ff' : '#5e6670'} /> <span>Profile</span>
              </div>
              <div className={`filter-item ${settingsTab === 'security' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('security')}>
                <Lock size={14} color={settingsTab === 'security' ? '#0055ff' : '#5e6670'} /> <span>Security</span>
              </div>
            </div>
            <h3>Preferences</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${settingsTab === 'notifications' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('notifications')}>
                <Bell size={14} color={settingsTab === 'notifications' ? '#0055ff' : '#5e6670'} /> <span>Notifications</span>
              </div>
              <div className={`filter-item ${settingsTab === 'application' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('application')}>
                <Globe size={14} color={settingsTab === 'application' ? '#0055ff' : '#5e6670'} /> <span>Application</span>
              </div>
            </div>
            <h3>Customization</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${settingsTab === 'categories' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('categories')}>
                <Tag size={14} color={settingsTab === 'categories' ? '#0055ff' : '#5e6670'} /> <span>Categories</span>
              </div>
              <div className={`filter-item ${settingsTab === 'sites' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('sites')}>
                <MapPin size={14} color={settingsTab === 'sites' ? '#0055ff' : '#5e6670'} /> <span>Sites</span>
              </div>
              <div className={`filter-item ${settingsTab === 'vlan-roles' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('vlan-roles')}>
                <Network size={14} color={settingsTab === 'vlan-roles' ? '#0055ff' : '#5e6670'} /> <span>VLAN Roles</span>
              </div>
            </div>
            <h3>System</h3>
            <div className="filter-list">
              <div className={`filter-item ${settingsTab === 'data' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('data')}>
                <Database size={14} color={settingsTab === 'data' ? '#0055ff' : '#5e6670'} /> <span>Data & Storage</span>
              </div>
              <div className={`filter-item ${settingsTab === 'about' ? 'active-filter' : ''}`} onClick={() => setSettingsTab?.('about')}>
                <Shield size={14} color={settingsTab === 'about' ? '#0055ff' : '#5e6670'} /> <span>About</span>
              </div>
            </div>
          </>
        )}
        {activeView === 'changelog' && (
          <>
            <h3>Filters</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedChangelogFilter === null ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(null)}>
                <History size={14} color={selectedChangelogFilter === null ? '#0055ff' : '#5e6670'} /> <span>All Changes</span>
              </div>
            </div>
            <h3>Action Type</h3>
            <div className="filter-list" style={{ marginBottom: '1.5rem' }}>
              <div className={`filter-item ${selectedChangelogFilter === 'create' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'create' ? null : 'create')}><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Created</span></div>
              <div className={`filter-item ${selectedChangelogFilter === 'update' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'update' ? null : 'update')}><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Updated</span></div>
              <div className={`filter-item ${selectedChangelogFilter === 'delete' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'delete' ? null : 'delete')}><div className="legend-dot" style={{ background: '#ef4444' }} /> <span>Deleted</span></div>
            </div>
            <h3>Object Type</h3>
            <div className="filter-list">
              <div className={`filter-item ${selectedChangelogFilter === 'Device' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'Device' ? null : 'Device')}><Server size={12} color={selectedChangelogFilter === 'Device' ? '#0055ff' : '#5e6670'} /> <span>Device</span></div>
              <div className={`filter-item ${selectedChangelogFilter === 'Subnet' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'Subnet' ? null : 'Subnet')}><Globe size={12} color={selectedChangelogFilter === 'Subnet' ? '#0055ff' : '#5e6670'} /> <span>Subnet</span></div>
              <div className={`filter-item ${selectedChangelogFilter === 'IPAddress' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'IPAddress' ? null : 'IPAddress')}><Globe size={12} color={selectedChangelogFilter === 'IPAddress' ? '#0055ff' : '#5e6670'} /> <span>IP Address</span></div>
              <div className={`filter-item ${selectedChangelogFilter === 'VLAN' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'VLAN' ? null : 'VLAN')}><Network size={12} color={selectedChangelogFilter === 'VLAN' ? '#0055ff' : '#5e6670'} /> <span>VLAN</span></div>
              <div className={`filter-item ${selectedChangelogFilter === 'Service' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'Service' ? null : 'Service')}><Box size={12} color={selectedChangelogFilter === 'Service' ? '#0055ff' : '#5e6670'} /> <span>Service</span></div>
              <div className={`filter-item ${selectedChangelogFilter === 'IPRange' ? 'active-filter' : ''}`} onClick={() => setSelectedChangelogFilter(selectedChangelogFilter === 'IPRange' ? null : 'IPRange')}><Globe size={12} color={selectedChangelogFilter === 'IPRange' ? '#0055ff' : '#5e6670'} /> <span>IP Range</span></div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default Sidebar
