'use client'

import { LayoutDashboard, Server, Shield, Network, Settings, LogOut } from 'lucide-react'

const Sidebar = () => {
  return (
    <div className="sidebar glass" style={{ width: '280px', height: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', borderRight: '1px solid var(--border)' }}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
          <Network color="white" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Homelab IP</h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <SidebarLink icon={<LayoutDashboard size={20} />} label="Dashboard" active />
        <SidebarLink icon={<Server size={20} />} label="Devices" />
        <SidebarLink icon={<Shield size={20} />} label="Security" />
        <SidebarLink icon={<Network size={20} />} label="Subnets" />
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <SidebarLink icon={<Settings size={20} />} label="Settings" />
        <SidebarLink icon={<LogOut size={20} />} label="Logout" />
      </div>

      <style jsx>{`
        .sidebar {
          position: sticky;
          top: 0;
          z-index: 50;
        }
      `}</style>
    </div>
  )
}

const SidebarLink = ({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) => {
  return (
    <div className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`} style={{ 
      justifyContent: 'flex-start', 
      width: '100%', 
      background: active ? 'var(--primary)' : 'transparent',
      color: active ? 'white' : 'var(--secondary-foreground)',
      border: 'none',
      padding: '0.75rem 1rem'
    }}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

export default Sidebar
