'use client'

import { 
  LayoutDashboard, Server, Network, Globe, Share2,
  Box, History, Settings, Search, Cpu, Database, 
  Laptop, Wifi, Command
} from 'lucide-react'
import { RefObject } from 'react'

export type ViewType = 'dashboard' | 'devices' | 'ipam' | 'vlans' | 'topology' | 'services' | 'changelog'

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
  searchInputRef?: RefObject<HTMLInputElement | null>
}

const navItems: { id: ViewType; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'devices', icon: Server, label: 'Devices' },
  { id: 'ipam', icon: Globe, label: 'IP Planner' },
  { id: 'vlans', icon: Network, label: 'VLANs' },
  { id: 'topology', icon: Share2, label: 'Topology' },
  { id: 'services', icon: Box, label: 'Services' },
  { id: 'changelog', icon: History, label: 'Changelog' },
]

const Sidebar = ({ activeView, setActiveView, searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, selectedVlanRole, setSelectedVlanRole, selectedIpFilter, setSelectedIpFilter, selectedServiceFilter, setSelectedServiceFilter, searchInputRef }: SidebarProps) => {
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
        <div className="sidebar-icon" title="Settings">
          <Settings size={18} />
        </div>
      </div>

      {/* Secondary Sidebar - Context Panel */}
      <div className="sidebar-secondary">
        <div className="sidebar-section-title">{navItems.find(n => n.id === activeView)?.label}</div>
        
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
              <div className={`filter-item ${selectedCategory === 'Server' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory('Server')}>
                <Server size={14} color={selectedCategory === 'Server' ? '#0055ff' : '#5e6670'} /> <span>Servers</span>
              </div>
              <div className={`filter-item ${selectedCategory === 'VM' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory('VM')}>
                <Cpu size={14} color={selectedCategory === 'VM' ? '#0055ff' : '#5e6670'} /> <span>Virtual Machines</span>
              </div>
              <div className={`filter-item ${selectedCategory === 'LXC' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory('LXC')}>
                <Database size={14} color={selectedCategory === 'LXC' ? '#0055ff' : '#5e6670'} /> <span>LXC Containers</span>
              </div>
              <div className={`filter-item ${selectedCategory === 'Networking' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory('Networking')}>
                <Network size={14} color={selectedCategory === 'Networking' ? '#0055ff' : '#5e6670'} /> <span>Networking</span>
              </div>
              <div className={`filter-item ${selectedCategory === 'IoT' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory('IoT')}>
                <Laptop size={14} color={selectedCategory === 'IoT' ? '#0055ff' : '#5e6670'} /> <span>IoT</span>
              </div>
            </div>
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
              <div className={`filter-item ${selectedCategory === 'Server' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'Server' ? null : 'Server')}><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Server</span></div>
              <div className={`filter-item ${selectedCategory === 'VM' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'VM' ? null : 'VM')}><div className="legend-dot" style={{ background: '#7c3aed' }} /> <span>VM</span></div>
              <div className={`filter-item ${selectedCategory === 'LXC' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'LXC' ? null : 'LXC')}><div className="legend-dot" style={{ background: '#f97316' }} /> <span>LXC Container</span></div>
              <div className={`filter-item ${selectedCategory === 'Networking' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'Networking' ? null : 'Networking')}><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Networking</span></div>
              <div className={`filter-item ${selectedCategory === 'IoT' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'IoT' ? null : 'IoT')}><div className="legend-dot" style={{ background: '#06b6d4' }} /> <span>IoT</span></div>
              <div className={`filter-item ${selectedCategory === 'Client' ? 'active-filter' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'Client' ? null : 'Client')}><div className="legend-dot" style={{ background: '#5e6670' }} /> <span>Client</span></div>
            </div>
            <h3>Controls</h3>
            <div className="filter-list">
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>Scroll</span> <span>Zoom in/out</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>Drag</span> <span>Pan canvas</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><span style={{ fontFamily: 'monospace', background: '#f1f3f5', padding: '1px 5px', borderRadius: '3px', marginRight: '6px' }}>Drag node</span> <span>Move device</span></div>
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
              <div className={`filter-item ${selectedVlanRole === 'management' ? 'active-filter' : ''}`} onClick={() => setSelectedVlanRole(selectedVlanRole === 'management' ? null : 'management')}><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Management</span></div>
              <div className={`filter-item ${selectedVlanRole === 'production' ? 'active-filter' : ''}`} onClick={() => setSelectedVlanRole(selectedVlanRole === 'production' ? null : 'production')}><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Production</span></div>
              <div className={`filter-item ${selectedVlanRole === 'iot' ? 'active-filter' : ''}`} onClick={() => setSelectedVlanRole(selectedVlanRole === 'iot' ? null : 'iot')}><div className="legend-dot" style={{ background: '#f97316' }} /> <span>IoT</span></div>
              <div className={`filter-item ${selectedVlanRole === 'guest' ? 'active-filter' : ''}`} onClick={() => setSelectedVlanRole(selectedVlanRole === 'guest' ? null : 'guest')}><div className="legend-dot" style={{ background: '#8b5cf6' }} /> <span>Guest</span></div>
            </div>
          </>
        )}
        {activeView === 'changelog' && (
          <>
            <h3>Info</h3>
            <div className="filter-list">
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Created</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Updated</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><div className="legend-dot" style={{ background: '#ef4444' }} /> <span>Deleted</span></div>
            </div>
            <h3 style={{ marginTop: '1.5rem' }}>Object Types</h3>
            <div className="filter-list">
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><Server size={12} color="#5e6670" /> <span>Device</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><Globe size={12} color="#5e6670" /> <span>Subnet</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><Globe size={12} color="#5e6670" /> <span>IP Address</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><Network size={12} color="#5e6670" /> <span>VLAN</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><Box size={12} color="#5e6670" /> <span>Service</span></div>
              <div className="filter-item" style={{ fontSize: '11px', color: '#5e6670' }}><Globe size={12} color="#5e6670" /> <span>IP Range</span></div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default Sidebar
