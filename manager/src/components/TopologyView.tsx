'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Wifi, Server, Cpu, Database, Monitor, Network, Share2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

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

const categoryColors: Record<string, string> = {
  Networking: '#0055ff',
  Server: '#10b981',
  VM: '#7c3aed',
  LXC: '#f97316',
  Client: '#64748b',
  IoT: '#06b6d4',
}

const categoryIcons: Record<string, React.ElementType> = {
  Networking: Wifi,
  Server: Server,
  VM: Cpu,
  LXC: Database,
  Client: Monitor,
  IoT: Monitor,
}

const NODE_W = 140
const NODE_H = 64

const TopologyView = () => {
  const [devices, setDevices] = useState<TopoDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [posOverrides, setPosOverrides] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch('/api/topology')
      .then(r => r.json())
      .then(setDevices)
      .finally(() => setLoading(false))
  }, [])

  const autoLayout = useMemo(() => {
    const newPos = new Map<string, { x: number; y: number }>()
    if (devices.length === 0) return newPos
    const categories = ['Networking', 'Server', 'VM', 'LXC', 'Client', 'IoT']
    const grouped: Record<string, TopoDevice[]> = {}
    devices.forEach(d => {
      if (!grouped[d.category]) grouped[d.category] = []
      grouped[d.category].push(d)
    })
    let yOffset = 60
    categories.forEach(cat => {
      const group = grouped[cat] || []
      const totalWidth = group.length * (NODE_W + 40)
      const startX = Math.max(40, (800 - totalWidth) / 2)
      group.forEach((d, i) => {
        newPos.set(d.id, { x: startX + i * (NODE_W + 40), y: yOffset })
      })
      if (group.length > 0) yOffset += NODE_H + 80
    })
    return newPos
  }, [devices])

  const positions = useMemo(() => {
    const merged = new Map(autoLayout)
    posOverrides.forEach((v, k) => merged.set(k, v))
    return merged
  }, [autoLayout, posOverrides])

  const edges = useMemo(() => {
    const edgeList: { from: string; to: string; label?: string | null; color: string }[] = []
    const edgeSet = new Set<string>()
    devices.forEach(d => {
      d.interfaces.forEach(iface => {
        iface.cableA.forEach(cable => {
          const key = [d.id, cable.interfaceB.device.id].sort().join('-')
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edgeList.push({ from: d.id, to: cable.interfaceB.device.id, label: cable.label, color: cable.color || '#94a3b8' })
          }
        })
        iface.cableB.forEach(cable => {
          const key = [d.id, cable.interfaceA.device.id].sort().join('-')
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edgeList.push({ from: d.id, to: cable.interfaceA.device.id, label: cable.label, color: cable.color || '#94a3b8' })
          }
        })
      })
    })
    return edgeList
  }, [devices])

  const selectedDevice = useMemo(() => devices.find(d => d.id === selectedNode) || null, [selectedNode, devices])

  // SVG coordinate conversion
  const svgPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: clientX, y: clientY }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    }
  }, [zoom, pan])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const pos = positions.get(nodeId)
    if (!pos) return
    const pt = svgPoint(e.clientX, e.clientY)
    setDragging(nodeId)
    setDragOffset({ x: pt.x - pos.x, y: pt.y - pos.y })
  }, [positions, svgPoint])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const pt = svgPoint(e.clientX, e.clientY)
      setPosOverrides(prev => {
        const next = new Map(prev)
        next.set(dragging, { x: pt.x - dragOffset.x, y: pt.y - dragOffset.y })
        return next
      })
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }, [dragging, dragOffset, svgPoint, isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setIsPanning(false)
  }, [])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'svg') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.max(0.3, Math.min(3, z + delta)))
  }, [])

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  if (loading) return <div className="view-loading">Loading topology...</div>

  if (devices.length === 0) {
    return (
      <div className="topo-view animate-fade-in">
        <div className="empty-state" style={{ flex: 1 }}>
          <Share2 size={40} color="#cbd5e1" />
          <h3>No devices to visualize</h3>
          <p>Add devices and connect them with cables to see your network topology here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="topo-view animate-fade-in">
      <div className="topo-canvas" style={{ position: 'relative' }}>
        {/* Zoom Controls */}
        <div className="topo-controls">
          <button className="topo-ctrl-btn" onClick={() => setZoom(z => Math.min(3, z + 0.2))} title="Zoom In"><ZoomIn size={14} /></button>
          <button className="topo-ctrl-btn" onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} title="Zoom Out"><ZoomOut size={14} /></button>
          <button className="topo-ctrl-btn" onClick={resetView} title="Reset View"><Maximize2 size={14} /></button>
          <span className="topo-zoom-label">{Math.round(zoom * 100)}%</span>
        </div>

        <svg
          ref={svgRef}
          className="topo-svg"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
          style={{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'grab' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Grid dots */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="0.8" fill="#e2e8f0" />
              </pattern>
            </defs>
            <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#grid)" />

            {/* Edges */}
            {edges.map((e, i) => {
              const from = positions.get(e.from)
              const to = positions.get(e.to)
              if (!from || !to) return null
              const fx = from.x + NODE_W / 2
              const fy = from.y + NODE_H / 2
              const tx = to.x + NODE_W / 2
              const ty = to.y + NODE_H / 2
              const midY = (fy + ty) / 2
              return (
                <g key={i}>
                  <path
                    d={`M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`}
                    fill="none"
                    stroke={e.color}
                    strokeWidth={2.5}
                    opacity={0.5}
                    strokeLinecap="round"
                  />
                  {/* Animated flow dot */}
                  <circle r={3} fill={e.color} opacity={0.8}>
                    <animateMotion
                      dur="3s"
                      repeatCount="indefinite"
                      path={`M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`}
                    />
                  </circle>
                  {e.label && (
                    <text x={(fx + tx) / 2} y={midY - 8} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={500}>{e.label}</text>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {devices.map(device => {
              const pos = positions.get(device.id)
              if (!pos) return null
              const color = categoryColors[device.category] || '#64748b'
              const isSelected = selectedNode === device.id
              return (
                <g
                  key={device.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => handleMouseDown(e, device.id)}
                  onClick={(e) => { e.stopPropagation(); setSelectedNode(isSelected ? null : device.id) }}
                  style={{ cursor: dragging === device.id ? 'grabbing' : 'pointer' }}
                >
                  {/* Shadow */}
                  <rect x={2} y={3} width={NODE_W} height={NODE_H} rx={10} fill="rgba(0,0,0,0.04)" />
                  {/* Card */}
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    fill="#ffffff"
                    stroke={isSelected ? color : '#e2e8f0'}
                    strokeWidth={isSelected ? 2.5 : 1}
                  />
                  {/* Top color strip (clipped to card shape) */}
                  <defs>
                    <clipPath id={`clip-${device.id}`}>
                      <rect width={NODE_W} height={NODE_H} rx={10} />
                    </clipPath>
                  </defs>
                  <rect x={0} y={0} width={NODE_W} height={4} fill={color} clipPath={`url(#clip-${device.id})`} />
                  {/* Status indicator */}
                  <circle cx={NODE_W - 14} cy={14} r={4} fill={device.status === 'active' ? '#10b981' : '#94a3b8'} />
                  {/* Text */}
                  <text x={16} y={24} fontSize={11} fontWeight={600} fill="#1a1a1a">
                    {device.name.length > 14 ? device.name.slice(0, 14) + '…' : device.name}
                  </text>
                  <text x={16} y={42} fontSize={10} fill="#64748b" fontFamily="var(--font-geist-mono), monospace">
                    {device.ipAddress}
                  </text>
                  <text x={16} y={56} fontSize={8} fill="#94a3b8">
                    {device.category}
                  </text>
                </g>
              )
            })}
          </g>
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
              <span className={`badge badge-${selectedDevice.status === 'active' ? 'green' : 'orange'}`}>{selectedDevice.status}</span>
            </div>
            {selectedDevice.platform && (
              <div className="topo-detail-item">
                <span className="topo-detail-label">Platform</span>
                <span style={{ fontSize: '12px' }}>{selectedDevice.platform}</span>
              </div>
            )}
            {selectedDevice.deviceType && (
              <div className="topo-detail-item">
                <span className="topo-detail-label">Hardware</span>
                <span style={{ fontSize: '12px' }}>{selectedDevice.deviceType.manufacturer.name} {selectedDevice.deviceType.model}</span>
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
