'use client'

import { Network, Search, Settings, Server, Cpu, Database } from 'lucide-react'

interface SidebarProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
}

const Sidebar = ({ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory }: SidebarProps) => {
  return (
    <>
      {/* Primary Sidebar - Icons Only */}
      <div className="sidebar-primary">
        <div 
          className={`sidebar-icon ${selectedCategory === 'Networking' ? 'active' : ''}`} 
          onClick={() => setSelectedCategory('Networking')}
          title="Networking"
        >
          <Network size={20} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="sidebar-icon" title="Settings">
          <Settings size={20} />
        </div>
      </div>

      {/* Secondary Sidebar - Filters & Search */}
      <div className="sidebar-secondary">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--unifi-text-muted)' }} size={14} />
            <input 
              type="text" 
              className="unifi-input" 
              placeholder="Search clients..." 
              style={{ paddingLeft: '2rem', height: '32px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <h3>Filters</h3>
        <div className="filter-list" style={{ marginBottom: '2rem' }}>
          <label className="filter-item" onClick={() => setSelectedCategory(null)}>
            <input type="radio" name="filter" checked={selectedCategory === null} readOnly />
            <span>All Devices</span>
          </label>
        </div>

        <h3>Categories</h3>
        <div className="filter-list" style={{ marginBottom: '2rem' }}>
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
        </div>

        <h3>Vendor</h3>
        <div className="filter-list">
          <div className="filter-item"><span>Proxmox</span></div>
          <div className="filter-item"><span>GL.iNet</span></div>
          <div className="filter-item"><span>Apple</span></div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
