'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Wifi, Server, Cpu, Database, Monitor, Network, Share2, ZoomIn, ZoomOut, Maximize2, Layers } from 'lucide-react'

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

interface TopoSubnet {
  id: string
  prefix: string
  mask: number
  description?: string | null
  gateway?: string | null
  role?: string | null
  vlan?: { vid: number; name: string } | null
}

const categoryColors: Record<string, string> = {
  Networking: '#0055ff',
  Server: '#10b981',
  VM: '#7c3aed',
  LXC: '#f97316',
  Client: '#64748b',
  IoT: '#06b6d4',
}

const subnetColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const categoryIcons: Record<string, React.ElementType> = {
  Networking: Wifi,
  Server: Server,
  VM: Cpu,
  LXC: Database,
  Client: Monitor,
  IoT: Monitor,
}

const NODE_W = 160
const NODE_H = 72

// Check if an IP belongs to a subnet
function ipInSubnet(ip: string, prefix: string, mask: number): boolean {
  const toNum = (addr: string) => addr.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0
  const ipNum = toNum(ip)
  const prefixNum = toNum(prefix)
  const maskBits = (0xFFFFFFFF << (32 - mask)) >>> 0
  return (ipNum & maskBits) === (prefixNum & maskBits)
}

const TopologyView = () => {
  const [devices, setDevices] = useState<TopoDevice[]>([])
  const [subnets, setSubnets] = useState<TopoSubnet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [posOverrides, setPosOverrides] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [showSubnetClouds, setShowSubnetClouds] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch('/api/topology')
      .then(r => r.json())
      .then(data => {
        setDevices(data.devices || data)
        setSubnets(data.subnets || [])
      })
      .finally(() => setLoading(false))
  }, [])

  // Map devices to their subnets
  const deviceSubnetMap = useMemo(() => {
    const map = new Map<string, string>() // deviceId -> subnetId
    devices.forEach(d => {
      for (const sub of subnets) {
        if (d.ipAddress && ipInSubnet(d.ipAddress, sub.prefix, sub.mask)) {
          map.set(d.id, sub.id)
          break
        }
      }
    })
    return map
  }, [devices, subnets])

  // Group devices by subnet for layout
  const subnetGroups = useMemo(() => {
    const groups = new Map<string, TopoDevice[]>()
    const ungrouped: TopoDevice[] = []
    devices.forEach(d => {
      const subId = deviceSubnetMap.get(d.id)
      if (subId) {
        if (!groups.has(subId)) groups.set(subId, [])
        groups.get(subId)!.push(d)
      } else {
        ungrouped.push(d)
      }
    })
    return { groups, ungrouped }
  }, [devices, deviceSubnetMap])

  const autoLayout = useMemo(() => {
    const newPos = new Map<string, { x: number; y: number }>()
    if (devices.length === 0) return newPos

    let yOffset = 60
    const PADDING = 40
    const GAP_X = 30
    const GAP_Y = 100

    // Layout grouped devices by subnet
    subnetGroups.groups.forEach((group) => {
      const cols = Math.min(group.length, 4)
      const rows = Math.ceil(group.length / cols)
      const totalWidth = cols * (NODE_W + GAP_X) - GAP_X
      const startX = Math.max(PADDING, (900 - totalWidth) / 2)

      group.forEach((d, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        newPos.set(d.id, {
          x: startX + col * (NODE_W + GAP_X),
          y: yOffset + row * (NODE_H + 30),
        })
      })
      yOffset += rows * (NODE_H + 30) + GAP_Y
    })

    // Layout ungrouped devices
    if (subnetGroups.ungrouped.length > 0) {
      const cols = Math.min(subnetGroups.ungrouped.length, 4)
      const totalWidth = cols * (NODE_W + GAP_X) - GAP_X
      const startX = Math.max(PADDING, (900 - totalWidth) / 2)
      subnetGroups.ungrouped.forEach((d, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        newPos.set(d.id, {
          x: startX + col * (NODE_W + GAP_X),
          y: yOffset + row * (NODE_H + 30),
        })
      })
    }

    return newPos
  }, [devices, subnetGroups])

  const positions = useMemo(() => {
    const merged = new Map(autoLayout)
    posOverrides.forEach((v, k) => merged.set(k, v))
    return merged
  }, [autoLayout, posOverrides])

  // Cable-based edges
  const cableEdges = useMemo(() => {
    const edgeList: { from: string; to: string; label?: string | null; color: string; type: 'cable' }[] = []
    const edgeSet = new Set<string>()
    devices.forEach(d => {
      d.interfaces.forEach(iface => {
        iface.cableA.forEach(cable => {
          const key = [d.id, cable.interfaceB.device.id].sort().join('-')
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edgeList.push({ from: d.id, to: cable.interfaceB.device.id, label: cable.label, color: cable.color || '#94a3b8', type: 'cable' })
          }
        })
        iface.cableB.forEach(cable => {
          const key = [d.id, cable.interfaceA.device.id].sort().join('-')
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edgeList.push({ from: d.id, to: cable.interfaceA.device.id, label: cable.label, color: cable.color || '#94a3b8', type: 'cable' })
          }
        })
      })
    })
    return edgeList
  }, [devices])

  // Network-based edges (devices on same subnet)
  const networkEdges = useMemo(() => {
    const edgeList: { from: string; to: string; color: string; subnetId: string; type: 'network' }[] = []
    const edgeSet = new Set<string>()
    subnetGroups.groups.forEach((group, subId) => {
      const subIdx = Array.from(subnetGroups.groups.keys()).indexOf(subId)
      const color = subnetColors[subIdx % subnetColors.length]
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const key = [group[i].id, group[j].id].sort().join('-')
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edgeList.push({ from: group[i].id, to: group[j].id, color, subnetId: subId, type: 'network' })
          }
        }
      }
    })
    return edgeList
  }, [subnetGroups])

  // Subnet cloud bounding boxes
  const subnetClouds = useMemo(() => {
    const clouds: { id: string; subnet: TopoSubnet; x: number; y: number; w: number; h: number; color: string }[] = []
    let subIdx = 0
    subnetGroups.groups.forEach((group, subId) => {
      const sub = subnets.find(s => s.id === subId)
      if (!sub) return
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      group.forEach(d => {
        const pos = positions.get(d.id)
        if (!pos) return
        minX = Math.min(minX, pos.x)
        minY = Math.min(minY, pos.y)
        maxX = Math.max(maxX, pos.x + NODE_W)
        maxY = Math.max(maxY, pos.y + NODE_H)
      })
      if (minX !== Infinity) {
        const pad = 24
        clouds.push({
          id: subId,
          subnet: sub,
          x: minX - pad,
          y: minY - 36,
          w: maxX - minX + pad * 2,
          h: maxY - minY + pad + 36 + 8,
          color: subnetColors[subIdx % subnetColors.length],
        })
      }
      subIdx++
    })
    return clouds
  }, [subnetGroups, subnets, positions])

  const selectedDevice = useMemo(() => devices.find(d => d.id === selectedNode) || null, [selectedNode, devices])

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: clientX, y: clientY }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    }
  }, [zoom, pan])

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
          <button
            className={`topo-ctrl-btn ${showSubnetClouds ? 'topo-ctrl-active' : ''}`}
            onClick={() => setShowSubnetClouds(v => !v)}
            title="Toggle Subnet Groups"
          >
            <Layers size={14} />
          </button>
          <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
          <button className="topo-ctrl-btn" onClick={() => setZoom(z => Math.min(3, z + 0.2))} title="Zoom In"><ZoomIn size={14} /></button>
          <button className="topo-ctrl-btn" onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} title="Zoom Out"><ZoomOut size={14} /></button>
          <button className="topo-ctrl-btn" onClick={resetView} title="Reset View"><Maximize2 size={14} /></button>
          <span className="topo-zoom-label">{Math.round(zoom * 100)}%</span>
        </div>

        {/* Subnet Legend */}
        {showSubnetClouds && subnetClouds.length > 0 && (
          <div className="topo-subnet-legend">
            {subnetClouds.map(cloud => (
              <div key={cloud.id} className="topo-subnet-legend-item">
                <span className="topo-subnet-legend-dot" style={{ background: cloud.color }} />
                <span className="topo-subnet-legend-text">
                  {cloud.subnet.prefix}/{cloud.subnet.mask}
                  {cloud.subnet.vlan && <span style={{ opacity: 0.6 }}> (VLAN {cloud.subnet.vlan.vid})</span>}
                </span>
              </div>
            ))}
          </div>
        )}

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
              {/* Animated dash for network edges */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#grid)" />

            {/* Subnet Clouds */}
            {showSubnetClouds && subnetClouds.map(cloud => (
              <g key={`cloud-${cloud.id}`}>
                <rect
                  x={cloud.x}
                  y={cloud.y}
                  width={cloud.w}
                  height={cloud.h}
                  rx={16}
                  fill={cloud.color}
                  fillOpacity={0.04}
                  stroke={cloud.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.2}
                  strokeDasharray="6 4"
                />
                {/* Subnet label */}
                <text
                  x={cloud.x + 12}
                  y={cloud.y + 16}
                  fontSize={10}
                  fontWeight={600}
                  fill={cloud.color}
                  opacity={0.7}
                >
                  {cloud.subnet.prefix}/{cloud.subnet.mask}
                  {cloud.subnet.vlan ? ` · VLAN ${cloud.subnet.vlan.vid}` : ''}
                  {cloud.subnet.description ? ` — ${cloud.subnet.description}` : ''}
                </text>
              </g>
            ))}

            {/* Network edges (same subnet) */}
            {showSubnetClouds && networkEdges.map((e, i) => {
              const from = positions.get(e.from)
              const to = positions.get(e.to)
              if (!from || !to) return null
              const fx = from.x + NODE_W / 2
              const fy = from.y + NODE_H / 2
              const tx = to.x + NODE_W / 2
              const ty = to.y + NODE_H / 2
              return (
                <g key={`net-${i}`}>
                  <line
                    x1={fx} y1={fy} x2={tx} y2={ty}
                    stroke={e.color}
                    strokeWidth={1.5}
                    strokeOpacity={0.15}
                    strokeDasharray="4 6"
                  />
                  {/* Animated flow pulse */}
                  <circle r={2.5} fill={e.color} opacity={0.5}>
                    <animateMotion
                      dur={`${2 + Math.random() * 2}s`}
                      repeatCount="indefinite"
                      path={`M ${fx} ${fy} L ${tx} ${ty}`}
                    />
                  </circle>
                </g>
              )
            })}

            {/* Cable edges */}
            {cableEdges.map((e, i) => {
              const from = positions.get(e.from)
              const to = positions.get(e.to)
              if (!from || !to) return null
              const fx = from.x + NODE_W / 2
              const fy = from.y + NODE_H / 2
              const tx = to.x + NODE_W / 2
              const ty = to.y + NODE_H / 2
              const midY = (fy + ty) / 2
              return (
                <g key={`cable-${i}`}>
                  <path
                    d={`M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`}
                    fill="none"
                    stroke={e.color}
                    strokeWidth={2.5}
                    opacity={0.6}
                    strokeLinecap="round"
                  />
                  {/* Animated flow dot */}
                  <circle r={3.5} fill={e.color} opacity={0.9} filter="url(#glow)">
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
              const Icon = categoryIcons[device.category] || Monitor
              const subId = deviceSubnetMap.get(device.id)
              const subIdx = subId ? Array.from(subnetGroups.groups.keys()).indexOf(subId) : -1
              const subColor = subIdx >= 0 ? subnetColors[subIdx % subnetColors.length] : null
              return (
                <g
                  key={device.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => handleMouseDown(e, device.id)}
                  onClick={(e) => { e.stopPropagation(); setSelectedNode(isSelected ? null : device.id) }}
                  style={{ cursor: dragging === device.id ? 'grabbing' : 'pointer' }}
                >
                  {/* Shadow */}
                  <rect x={2} y={3} width={NODE_W} height={NODE_H} rx={12} fill="rgba(0,0,0,0.06)" />
                  {/* Card */}
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={12}
                    fill="#ffffff"
                    stroke={isSelected ? color : '#e2e8f0'}
                    strokeWidth={isSelected ? 2.5 : 1}
                  />
                  {/* Top color strip */}
                  <defs>
                    <clipPath id={`clip-${device.id}`}>
                      <rect width={NODE_W} height={NODE_H} rx={12} />
                    </clipPath>
                  </defs>
                  <rect x={0} y={0} width={NODE_W} height={4} fill={color} clipPath={`url(#clip-${device.id})`} />
                  {/* Category icon */}
                  <foreignObject x={10} y={12} width={20} height={20}>
                    <div style={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} />
                    </div>
                  </foreignObject>
                  {/* Status indicator */}
                  <circle cx={NODE_W - 14} cy={14} r={4.5} fill={device.status === 'active' ? '#10b981' : device.status === 'offline' ? '#ef4444' : '#94a3b8'} />
                  {device.status === 'active' && (
                    <circle cx={NODE_W - 14} cy={14} r={4.5} fill="none" stroke="#10b981" strokeWidth={1} opacity={0.4}>
                      <animate attributeName="r" from="4.5" to="10" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Text */}
                  <text x={32} y={24} fontSize={11} fontWeight={600} fill="#1a1a1a">
                    {device.name.length > 14 ? device.name.slice(0, 14) + '…' : device.name}
                  </text>
                  <text x={12} y={44} fontSize={10} fill="#64748b" fontFamily="var(--font-geist-mono), monospace">
                    {device.ipAddress}
                  </text>
                  {/* Subnet badge */}
                  {subColor && showSubnetClouds && (
                    <rect x={12} y={52} width={8} height={8} rx={2} fill={subColor} opacity={0.6} />
                  )}
                  <text x={subColor && showSubnetClouds ? 24 : 12} y={60} fontSize={8} fill="#94a3b8">
                    {device.services.length > 0 ? `${device.category} · ${device.services.length} svc` : device.category}
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
            {/* Show subnet info */}
            {(() => {
              const subId = deviceSubnetMap.get(selectedDevice.id)
              const sub = subId ? subnets.find(s => s.id === subId) : null
              if (!sub) return null
              return (
                <div className="topo-detail-item">
                  <span className="topo-detail-label">Network</span>
                  <span style={{ fontSize: '12px' }}>{sub.prefix}/{sub.mask}{sub.vlan ? ` (VLAN ${sub.vlan.vid})` : ''}</span>
                </div>
              )
            })()}
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
          {/* Connected devices on same subnet */}
          {(() => {
            const subId = deviceSubnetMap.get(selectedDevice.id)
            if (!subId) return null
            const peers = (subnetGroups.groups.get(subId) || []).filter(d => d.id !== selectedDevice.id)
            if (peers.length === 0) return null
            return (
              <div className="topo-detail-section">
                <h4>Same Network</h4>
                {peers.map(p => (
                  <div key={p.id} className="topo-iface-row" style={{ cursor: 'pointer' }} onClick={() => setSelectedNode(p.id)}>
                    <Server size={12} color="#64748b" />
                    <span>{p.name}</span>
                    <code style={{ fontSize: '9px', color: '#94a3b8', marginLeft: 'auto' }}>{p.ipAddress}</code>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default TopologyView
