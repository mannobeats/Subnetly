'use client'

import { 
  LayoutDashboard, Server, Network, Globe, Share2, 
  Box, History, Settings, Search, Cpu, Database, 
  Laptop, Wifi
} from 'lucide-react'

export type ViewType = 'dashboard' | 'devices' | 'ipam' | 'vlans' | 'topology' | 'services' | 'changelog'

interface SidebarProps {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  searchTerm: string
  setSearchTerm: (value: string) => void
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
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

const Sidebar = ({ activeView, setActiveView, searchTerm, setSearchTerm, selectedCategory, setSelectedCategory }: SidebarProps) => {
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
            type="text" 
            className="unifi-input" 
            placeholder="Search..." 
            style={{ paddingLeft: '2rem', height: '32px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
            <h3>Legend</h3>
            <div className="filter-list">
              <div className="filter-item"><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Gateway</span></div>
              <div className="filter-item"><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Assigned</span></div>
              <div className="filter-item"><div className="legend-dot" style={{ background: '#f59e0b' }} /> <span>DHCP Pool</span></div>
              <div className="filter-item"><div className="legend-dot" style={{ background: '#8b5cf6' }} /> <span>Reserved</span></div>
              <div className="filter-item"><div className="legend-dot" style={{ background: '#06b6d4' }} /> <span>Infrastructure</span></div>
              <div className="filter-item"><div className="legend-dot" style={{ background: '#f1f3f5', border: '1px solid #dee2e6' }} /> <span>Available</span></div>
            </div>
          </>
        )}

        {activeView === 'vlans' && (
          <>
            <h3>VLAN Roles</h3>
            <div className="filter-list">
              <div className="filter-item"><div className="legend-dot" style={{ background: '#0055ff' }} /> <span>Management</span></div>
              <div className="filter-item"><div className="legend-dot" style={{ background: '#10b981' }} /> <span>Production</span></div>
              <div className="filter-item"><div className="legend-dot" style={{ background: '#f97316' }} /> <span>IoT</span></div>
              <div className="filter-item"><div className="legend-dot" style={{ background: '#8b5cf6' }} /> <span>Guest</span></div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default Sidebar
