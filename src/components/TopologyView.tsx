'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Wifi, Server, Cpu, Database, Monitor, Share2 } from 'lucide-react'
import TopologyControls from '@/components/topology/TopologyControls'
import TopologyLegend from '@/components/topology/TopologyLegend'
import TopologyDetailPanel from '@/components/topology/TopologyDetailPanel'

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
  Networking: '#3366ff',
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

interface TopologyViewProps {
  selectedCategory?: string | null
}

const STORAGE_KEY = 'topo-positions'

function loadPositions(): Map<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      return new Map(Object.entries(obj))
    }
  } catch { /* ignore */ }
  return new Map()
}

function savePositions(map: Map<string, { x: number; y: number }>) {
  try {
    const obj: Record<string, { x: number; y: number }> = {}
    map.forEach((v, k) => { obj[k] = v })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch { /* ignore */ }
}

const TopologyView = ({ selectedCategory = null }: TopologyViewProps) => {
  const [devices, setDevices] = useState<TopoDevice[]>([])
  const [subnets, setSubnets] = useState<TopoSubnet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [posOverrides, setPosOverrides] = useState<Map<string, { x: number; y: number }>>(loadPositions)
  const [dragging, setDragging] = useState<string | null>(null)
  const [draggingSubnet, setDraggingSubnet] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [showSubnetClouds, setShowSubnetClouds] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragMovedRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTopology() {
      try {
        setLoadError(null)
        const response = await fetch('/api/topology', { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to load topology (${response.status})`)
        }
        const data = await response.json()
        setDevices(data.devices || data)
        setSubnets(data.subnets || [])
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setDevices([])
        setSubnets([])
        setLoadError('Failed to load topology data')
      } finally {
        setLoading(false)
      }
    }

    loadTopology()
    return () => controller.abort()
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

    let yOffset = 20
    const PADDING = 40
    const GAP_X = 30
    const GAP_Y = 60

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
          y: yOffset + 32 + row * (NODE_H + 20),
        })
      })
      yOffset += 32 + rows * (NODE_H + 20) + GAP_Y
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
          y: yOffset + row * (NODE_H + 20),
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
        const pad = 28
        clouds.push({
          id: subId,
          subnet: sub,
          x: minX - pad,
          y: minY - 40,
          w: maxX - minX + pad * 2,
          h: maxY - minY + pad + 40 + 16,
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
    dragMovedRef.current = false
    setDragging(nodeId)
    setDragOffset({ x: pt.x - pos.x, y: pt.y - pos.y })
  }, [positions, svgPoint])

  // Subnet block drag: drag the cloud header to move all devices in that subnet
  const handleSubnetMouseDown = useCallback((e: React.MouseEvent, subnetId: string) => {
    e.stopPropagation()
    const pt = svgPoint(e.clientX, e.clientY)
    dragMovedRef.current = false
    setDraggingSubnet(subnetId)
    setDragOffset({ x: pt.x, y: pt.y })
  }, [svgPoint])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      dragMovedRef.current = true
      const pt = svgPoint(e.clientX, e.clientY)
      setPosOverrides(prev => {
        const next = new Map(prev)
        next.set(dragging, { x: pt.x - dragOffset.x, y: pt.y - dragOffset.y })
        return next
      })
    } else if (draggingSubnet) {
      dragMovedRef.current = true
      const pt = svgPoint(e.clientX, e.clientY)
      const dx = pt.x - dragOffset.x
      const dy = pt.y - dragOffset.y
      const group = subnetGroups.groups.get(draggingSubnet)
      if (group) {
        setPosOverrides(prev => {
          const next = new Map(prev)
          group.forEach(d => {
            const pos = positions.get(d.id)
            if (pos) next.set(d.id, { x: pos.x + dx, y: pos.y + dy })
          })
          return next
        })
        setDragOffset({ x: pt.x, y: pt.y })
      }
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }, [dragging, draggingSubnet, dragOffset, svgPoint, isPanning, panStart, subnetGroups, positions])

  const handleMouseUp = useCallback(() => {
    if (dragging || draggingSubnet) {
      // Persist positions to localStorage
      setPosOverrides(prev => { savePositions(prev); return prev })
    }
    setDragging(null)
    setDraggingSubnet(null)
    setIsPanning(false)
  }, [dragging, draggingSubnet])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'svg') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const zoomAtPoint = useCallback((clientX: number, clientY: number, nextZoom: number) => {
    if (!svgRef.current) return
    const clampedZoom = Math.max(0.3, Math.min(3, nextZoom))
    const rect = svgRef.current.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    const worldX = (localX - pan.x) / zoom
    const worldY = (localY - pan.y) / zoom
    setZoom(clampedZoom)
    setPan({
      x: localX - worldX * clampedZoom,
      y: localY - worldY * clampedZoom,
    })
  }, [pan, zoom])

  const zoomByStep = useCallback((step: number) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, zoom + step)
  }, [zoom, zoomAtPoint])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    // Ctrl/Meta + wheel: zoom at cursor. Plain wheel: pan canvas.
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -0.12 : 0.12
      zoomAtPoint(e.clientX, e.clientY, zoom + delta)
      return
    }

    const speed = 0.8
    if (e.shiftKey) {
      setPan(prev => ({ ...prev, x: prev.x - e.deltaY * speed }))
      return
    }

    setPan(prev => ({
      x: prev.x - e.deltaX * speed,
      y: prev.y - e.deltaY * speed,
    }))
  }, [zoom, zoomAtPoint])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const onWheel = (event: WheelEvent) => handleWheel(event)
    svg.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      svg.removeEventListener('wheel', onWheel)
    }
  }, [handleWheel])

  // Center the canvas on the content
  const centerCanvas = useCallback(() => {
    if (!svgRef.current || positions.size === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + NODE_W)
      maxY = Math.max(maxY, pos.y + NODE_H)
    })
    if (minX === Infinity) return
    const contentW = maxX - minX
    const contentH = maxY - minY
    const centerX = minX + contentW / 2
    const centerY = minY + contentH / 2
    const newZoom = Math.min(1, Math.min((rect.width - 80) / contentW, (rect.height - 80) / contentH))
    setPan({ x: rect.width / 2 - centerX * newZoom, y: rect.height / 2 - centerY * newZoom })
    setZoom(newZoom)
  }, [positions])

  // Auto-center on first load
  const hasCentered = useRef(false)
  useEffect(() => {
    if (!hasCentered.current && positions.size > 0 && svgRef.current) {
      hasCentered.current = true
      // Small delay to ensure SVG has rendered with correct dimensions
      requestAnimationFrame(() => centerCanvas())
    }
  }, [positions, centerCanvas])

  const resetView = () => { centerCanvas() }
  const resetLayout = () => { setPosOverrides(new Map()); localStorage.removeItem(STORAGE_KEY) }

  if (loading) return <div className="flex items-center justify-center h-[200px] gap-2 text-muted-foreground text-[13px]">Loading topology...</div>

  if (loadError) {
    return (
      <div className="flex gap-0 h-full relative animate-fade-in">
        <div className="flex flex-col items-center justify-center p-16 px-8 text-center bg-(--surface) border border-border rounded-lg flex-1">
          <h3>Topology unavailable</h3>
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="flex gap-0 h-full relative animate-fade-in">
        <div className="flex flex-col items-center justify-center p-16 px-8 text-center bg-(--surface) border border-border rounded-lg flex-1">
          <Share2 size={40} color="#cbd5e1" />
          <h3>No devices to visualize</h3>
          <p>Add devices and connect them with cables to see your network topology here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-0 h-full relative animate-fade-in">
      <div className="flex-1 bg-(--surface) border border-border rounded-lg overflow-hidden min-h-[500px] relative">
        <TopologyControls
          showSubnetClouds={showSubnetClouds}
          zoom={zoom}
          onToggleSubnetClouds={() => setShowSubnetClouds(v => !v)}
          onZoomIn={() => zoomByStep(0.2)}
          onZoomOut={() => zoomByStep(-0.2)}
          onCenterView={resetView}
          onResetLayout={resetLayout}
        />

        {showSubnetClouds && <TopologyLegend clouds={subnetClouds} />}

        <svg
          ref={svgRef}
          className="w-full h-full min-h-[500px]"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseDown={handleCanvasMouseDown}
          onClick={() => setSelectedNode(null)}
          style={{
            cursor: isPanning ? 'grabbing' : (dragging || draggingSubnet) ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
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
                {/* Draggable subnet label bar */}
                <rect
                  x={cloud.x}
                  y={cloud.y}
                  width={cloud.w}
                  height={28}
                  rx={16}
                  fill={cloud.color}
                  fillOpacity={0.08}
                  style={{ cursor: 'move' }}
                  onMouseDown={(e) => handleSubnetMouseDown(e, cloud.id)}
                />
                <clipPath id={`clip-label-${cloud.id}`}>
                  <rect x={cloud.x + 8} y={cloud.y + 4} width={Math.max(cloud.w - 80, 40)} height={22} />
                </clipPath>
                <text
                  x={cloud.x + 12}
                  y={cloud.y + 18}
                  fontSize={10}
                  fontWeight={600}
                  fill={cloud.color}
                  opacity={0.8}
                  style={{ pointerEvents: 'none' }}
                  clipPath={`url(#clip-label-${cloud.id})`}
                >
                  {cloud.subnet.prefix}/{cloud.subnet.mask}
                  {cloud.subnet.vlan ? ` · VLAN ${cloud.subnet.vlan.vid}` : ''}
                  {cloud.subnet.description ? ` — ${cloud.subnet.description}` : ''}
                </text>
                <text
                  x={cloud.x + cloud.w - 12}
                  y={cloud.y + 18}
                  fontSize={8}
                  fill={cloud.color}
                  opacity={0.5}
                  textAnchor="end"
                  style={{ pointerEvents: 'none' }}
                >
                  drag to move
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
              const dimmed = selectedCategory ? device.category !== selectedCategory : false
              return (
                <g
                  key={device.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => handleMouseDown(e, device.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (dragMovedRef.current) {
                      dragMovedRef.current = false
                      return
                    }
                    setSelectedNode(isSelected ? null : device.id)
                  }}
                  style={{ cursor: dragging === device.id ? 'grabbing' : 'pointer', opacity: dimmed ? 0.15 : 1, transition: 'opacity 0.3s ease' }}
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

      {selectedDevice && (
        <TopologyDetailPanel
          selectedDevice={selectedDevice}
          categoryColors={categoryColors}
          categoryIcons={categoryIcons}
          selectedSubnet={(deviceSubnetMap.get(selectedDevice.id) ? subnets.find(s => s.id === deviceSubnetMap.get(selectedDevice.id)) : null) || null}
          peers={(() => {
            const subId = deviceSubnetMap.get(selectedDevice.id)
            if (!subId) return []
            return (subnetGroups.groups.get(subId) || [])
              .filter(d => d.id !== selectedDevice.id)
              .map(d => ({ id: d.id, name: d.name, ipAddress: d.ipAddress }))
          })()}
          onSelectPeer={(id) => setSelectedNode(id)}
        />
      )}
    </div>
  )
}

export default TopologyView
