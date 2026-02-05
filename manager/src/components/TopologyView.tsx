'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Wifi, Server, Cpu, Database, Monitor, Network } from 'lucide-react'

interface TopoDevice {
  id: string
  name: string
  ipAddress: string
  category: string
  status: string
  platform?: string | null
  deviceType?: { model: string; manufacturer: { name: string } } | null
  interfaces: {
    id: string
    name: string
    cableA: { id: string; label?: string | null; color?: string | null; interfaceB: { device: { id: string; name: string } } }[]
    cableB: { id: string; label?: string | null; color?: string | null; interfaceA: { device: { id: string; name: string } } }[]
  }[]
  services: { id: string; name: string; ports: string; protocol: string }[]
}

interface TopoNode {
  id: string
  name: string
  ip: string
  category: string
  x: number
  y: number
  platform?: string | null
  manufacturer?: string | null
  model?: string | null
  services: { name: string; ports: string }[]
}

interface TopoEdge {
  from: string
  to: string
  label?: string | null
  color: string
}

const categoryIcons: Record<string, React.ElementType> = {
  Networking: Wifi,
  Server: Server,
  VM: Cpu,
  LXC: Database,
  Client: Monitor,
  IoT: Monitor,
}

const categoryColors: Record<string, string> = {
  Networking: '#0055ff',
  Server: '#10b981',
  VM: '#7c3aed',
  LXC: '#f97316',
  Client: '#64748b',
  IoT: '#06b6d4',
}

const TopologyView = () => {
  const [devices, setDevices] = useState<TopoDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/topology')
      .then(r => r.json())
      .then(setDevices)
      .finally(() => setLoading(false))
  }, [])

  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, TopoNode>()
    const edgeList: TopoEdge[] = []

    // Layout: networking at top, servers in middle, VMs/LXCs at bottom
    const categories = ['Networking', 'Server', 'VM', 'LXC', 'Client', 'IoT']
    const grouped: Record<string, TopoDevice[]> = {}
    devices.forEach(d => {
      if (!grouped[d.category]) grouped[d.category] = []
      grouped[d.category].push(d)
    })

    let yOffset = 80
    categories.forEach(cat => {
      const group = grouped[cat] || []
      const totalWidth = group.length * 180
      const startX = Math.max(60, (900 - totalWidth) / 2)
      group.forEach((d, i) => {
        nodeMap.set(d.id, {
          id: d.id,
          name: d.name,
          ip: d.ipAddress,
          category: d.category,
          x: startX + i * 180,
          y: yOffset,
          platform: d.platform,
          manufacturer: d.deviceType?.manufacturer?.name,
          model: d.deviceType?.model,
          services: d.services.map(s => ({ name: s.name, ports: s.ports })),
        })
      })
      if (group.length > 0) yOffset += 140
    })

    // Build edges from cables
    const edgeSet = new Set<string>()
    devices.forEach(d => {
      d.interfaces.forEach(iface => {
        iface.cableA.forEach(cable => {
          const key = [d.id, cable.interfaceB.device.id].sort().join('-')
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edgeList.push({ from: d.id, to: cable.interfaceB.device.id, label: cable.label, color: cable.color || '#cbd5e1' })
          }
        })
        iface.cableB.forEach(cable => {
          const key = [d.id, cable.interfaceA.device.id].sort().join('-')
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edgeList.push({ from: d.id, to: cable.interfaceA.device.id, label: cable.label, color: cable.color || '#cbd5e1' })
          }
        })
      })
    })

    return { nodes: Array.from(nodeMap.values()), edges: edgeList }
  }, [devices])

  const selectedDevice = useMemo(() => {
    if (!selectedNode) return null
    return devices.find(d => d.id === selectedNode) || null
  }, [selectedNode, devices])

  if (loading) return <div className="view-loading">Loading topology...</div>

  return (
    <div className="topo-view animate-fade-in">
      <div className="topo-canvas" ref={canvasRef}>
        <svg className="topo-svg" viewBox={`0 0 900 ${Math.max(500, nodes.length * 50 + 200)}`} preserveAspectRatio="xMidYMid meet">
          {/* Edges */}
          {edges.map((e, i) => {
            const from = nodes.find(n => n.id === e.from)
            const to = nodes.find(n => n.id === e.to)
            if (!from || !to) return null
            const midY = (from.y + to.y) / 2
            return (
              <g key={i}>
                <path
                  d={`M ${from.x + 60} ${from.y + 30} C ${from.x + 60} ${midY}, ${to.x + 60} ${midY}, ${to.x + 60} ${to.y + 30}`}
                  fill="none"
                  stroke={e.color}
                  strokeWidth={2}
                  strokeDasharray={e.color === '#cbd5e1' ? '4 4' : 'none'}
                  opacity={0.6}
                />
                {e.label && (
                  <text
                    x={(from.x + to.x) / 2 + 60}
                    y={midY}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#94a3b8"
                    dy={-6}
                  >
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const color = categoryColors[node.category] || '#64748b'
            const isSelected = selectedNode === node.id
            const Icon = categoryIcons[node.category] || Monitor
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  width={120}
                  height={60}
                  rx={8}
                  fill={isSelected ? `${color}18` : '#ffffff'}
                  stroke={isSelected ? color : '#e2e8f0'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <circle cx={16} cy={20} r={4} fill={color} />
                <text x={26} y={24} fontSize={11} fontWeight={600} fill="#1a1a1a">{node.name.length > 14 ? node.name.slice(0, 14) + '…' : node.name}</text>
                <text x={16} y={44} fontSize={10} fill="#64748b" fontFamily="monospace">{node.ip}</text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail Panel */}
      {selectedDevice && (
        <div className="topo-detail-panel animate-fade-in">
          <div className="topo-detail-header">
            <div className="topo-detail-icon" style={{ background: `${categoryColors[selectedDevice.category]}14`, color: categoryColors[selectedDevice.category] }}>
              {(() => { const I = categoryIcons[selectedDevice.category] || Monitor; return <I size={20} /> })()}
            </div>
            <div>
              <h3>{selectedDevice.name}</h3>
              <code style={{ fontSize: '11px', color: '#64748b' }}>{selectedDevice.ipAddress}</code>
            </div>
          </div>
          <div className="topo-detail-grid">
            <div className="topo-detail-item">
              <span className="topo-detail-label">Category</span>
              <span className="badge" style={{ background: `${categoryColors[selectedDevice.category]}14`, color: categoryColors[selectedDevice.category] }}>{selectedDevice.category}</span>
            </div>
            <div className="topo-detail-item">
              <span className="topo-detail-label">Status</span>
              <span className="badge badge-green">{selectedDevice.status}</span>
            </div>
            {selectedDevice.platform && (
              <div className="topo-detail-item">
                <span className="topo-detail-label">Platform</span>
                <span>{selectedDevice.platform}</span>
              </div>
            )}
            {selectedDevice.deviceType && (
              <div className="topo-detail-item">
                <span className="topo-detail-label">Hardware</span>
                <span>{selectedDevice.deviceType.manufacturer.name} {selectedDevice.deviceType.model}</span>
              </div>
            )}
          </div>
          {selectedDevice.interfaces.length > 0 && (
            <div className="topo-detail-section">
              <h4>Interfaces</h4>
              {selectedDevice.interfaces.map(iface => (
                <div key={iface.id} className="topo-iface-row">
                  <Network size={12} color="#64748b" />
                  <span>{iface.name}</span>
                </div>
              ))}
            </div>
          )}
          {selectedDevice.services.length > 0 && (
            <div className="topo-detail-section">
              <h4>Services</h4>
              {selectedDevice.services.map(s => (
                <div key={s.id} className="topo-service-row">
                  <span className="topo-service-name">{s.name}</span>
                  <code className="topo-service-port">{s.protocol}:{s.ports}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TopologyView
