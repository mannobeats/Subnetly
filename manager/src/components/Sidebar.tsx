'use client'

import { Network, Search, Settings, Server, Cpu, Database, Cloud } from 'lucide-react'

interface SidebarProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
}

const Sidebar = ({ searchTerm, setSearchTerm }: SidebarProps) => {
  return (
    <>
      {/* Primary Sidebar - Icons Only */}
      <div className="sidebar-primary">
        <div className="sidebar-icon active">
          <Network size={20} />
        </div>
        <div className="sidebar-icon">
          <Cpu size={20} />
        </div>
        <div className="sidebar-icon">
          <Database size={20} />
        </div>
        <div className="sidebar-icon">
          <Cloud size={20} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="sidebar-icon">
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
          <label className="filter-item">
            <input type="checkbox" defaultChecked />
            <span>All Devices</span>
          </label>
          <label className="filter-item">
            <input type="checkbox" />
            <span>Active Only</span>
          </label>
          <label className="filter-item">
            <input type="checkbox" />
            <span>Static IPs</span>
          </label>
        </div>

        <h3>Categories</h3>
        <div className="filter-list" style={{ marginBottom: '2rem' }}>
          <div className="filter-item"><Server size={14} color="#5e6670" /> <span>Servers</span></div>
          <div className="filter-item"><Cpu size={14} color="#5e6670" /> <span>Virtual Machines</span></div>
          <div className="filter-item"><Database size={14} color="#5e6670" /> <span>LXC Containers</span></div>
          <div className="filter-item"><Network size={14} color="#5e6670" /> <span>Networking</span></div>
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
