'use client'

import { Monitor, Network, Server } from 'lucide-react'

interface TopoDevice {
  id: string
  name: string
  ipAddress: string
  category: string
  status: string
  platform?: string | null
  deviceType?: { model: string; manufacturer: { name: string } } | null
  interfaces: { id: string; name: string }[]
  services: { id: string; name: string; ports: string; protocol: string }[]
}

interface TopoSubnet {
  id: string
  prefix: string
  mask: number
  vlan?: { vid: number; name: string } | null
}

interface TopologyDetailPanelProps {
  selectedDevice: TopoDevice
  categoryColors: Record<string, string>
  categoryIcons: Record<string, React.ElementType>
  selectedSubnet: TopoSubnet | null
  peers: { id: string; name: string; ipAddress: string }[]
  onSelectPeer: (id: string) => void
}

export default function TopologyDetailPanel({
  selectedDevice,
  categoryColors,
  categoryIcons,
  selectedSubnet,
  peers,
  onSelectPeer,
}: TopologyDetailPanelProps) {
  return (
    <div className="w-80 bg-(--surface) border border-border rounded-lg p-5 ml-4 overflow-y-auto max-h-full animate-fade-in">
      <div className="flex items-center gap-4 mb-5 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${categoryColors[selectedDevice.category]}14`, color: categoryColors[selectedDevice.category] }}>
          {(() => { const I = categoryIcons[selectedDevice.category] || Monitor; return <I size={20} /> })()}
        </div>
        <div>
          <h3>{selectedDevice.name}</h3>
          <code className="text-[11px] text-(--text-slate)">{selectedDevice.ipAddress}</code>
        </div>
      </div>
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-(--text-muted) font-semibold uppercase">Category</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${categoryColors[selectedDevice.category]}14`, color: categoryColors[selectedDevice.category] }}>{selectedDevice.category}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-(--text-muted) font-semibold uppercase">Status</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${selectedDevice.status === 'active' ? 'bg-(--green-bg) text-(--green)' : 'bg-(--orange-bg) text-(--orange)'}`}>{selectedDevice.status}</span>
        </div>
        {selectedDevice.platform && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-(--text-muted) font-semibold uppercase">Platform</span>
            <span className="text-xs">{selectedDevice.platform}</span>
          </div>
        )}
        {selectedDevice.deviceType && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-(--text-muted) font-semibold uppercase">Hardware</span>
            <span className="text-xs">{selectedDevice.deviceType.manufacturer.name} {selectedDevice.deviceType.model}</span>
          </div>
        )}
        {selectedSubnet && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-(--text-muted) font-semibold uppercase">Network</span>
            <span className="text-xs">{selectedSubnet.prefix}/{selectedSubnet.mask}{selectedSubnet.vlan ? ` (VLAN ${selectedSubnet.vlan.vid})` : ''}</span>
          </div>
        )}
      </div>
      {selectedDevice.interfaces.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4>Interfaces</h4>
          {selectedDevice.interfaces.map(iface => (
            <div key={iface.id} className="flex items-center gap-2 py-1 text-xs">
              <Network size={12} color="#64748b" />
              <span>{iface.name}</span>
            </div>
          ))}
        </div>
      )}
      {selectedDevice.services.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4>Services</h4>
          {selectedDevice.services.map(s => (
            <div key={s.id} className="flex items-center justify-between py-1">
              <span className="text-xs font-medium">{s.name}</span>
              <code className="text-[10px] bg-(--muted-bg) px-1.5 py-0.5 rounded">{s.protocol}:{s.ports}</code>
            </div>
          ))}
        </div>
      )}
      {peers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4>Same Network</h4>
          {peers.map(p => (
            <div key={p.id} className="flex items-center gap-2 py-1 text-xs cursor-pointer" onClick={() => onSelectPeer(p.id)}>
              <Server size={12} color="#64748b" />
              <span>{p.name}</span>
              <code className="text-[9px] text-(--text-light) ml-auto">{p.ipAddress}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

