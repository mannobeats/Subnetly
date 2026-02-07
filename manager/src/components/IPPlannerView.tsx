'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { IPAddress, IPRange, Device } from '@/types'
import { Info, Plus, Trash2, Globe, Server, LayoutGrid, List, BarChart3, Edit2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface SubnetWithRelations {
  id: string
  prefix: string
  mask: number
  description?: string | null
  gateway?: string | null
  status: string
  role?: string | null
  ipAddresses: IPAddress[]
  ipRanges: IPRange[]
  vlan?: { vid: number; name: string; id: string } | null
}

interface IPPlannerProps {
  searchTerm: string
  selectedIpFilter?: string | null
  highlightId?: string | null
}

const rangeColors: Record<string, { bg: string; border: string; label: string }> = {
  dhcp: { bg: '#fef3c7', border: '#f59e0b', label: 'DHCP' },
  reserved: { bg: '#ede9fe', border: '#8b5cf6', label: 'Reserved' },
  infrastructure: { bg: '#cffafe', border: '#06b6d4', label: 'Infra' },
  general: { bg: '#f1f5f9', border: '#94a3b8', label: 'General' },
}

const emptySubnetForm = { prefix: '', mask: '24', description: '', gateway: '', vlanId: '', role: '' }
const emptyRangeForm = { startOctet: '', endOctet: '', role: 'dhcp', description: '' }
const emptyIpForm = { address: '', dnsName: '', description: '', status: 'active', deviceId: '' }

// ─── Subnet math helpers ────────────────────────────────────
function subnetSize(mask: number): number {
  return Math.pow(2, 32 - mask)
}
function usableHosts(mask: number): number {
  if (mask >= 31) return mask === 31 ? 2 : 1 // /31 point-to-point, /32 host route
  return subnetSize(mask) - 2 // subtract network + broadcast
}
function getSubnetBlock(prefix: string, mask: number): { base: string; startOctet: number; blockSize: number } {
  const parts = prefix.split('.').map(Number)
  if (mask >= 24) {
    const blockSize = subnetSize(mask)
    const startOctet = parts[3] || 0
    const base = parts.slice(0, 3).join('.')
    return { base, startOctet, blockSize }
  }
  // Large subnets: return full size so pagination can handle it
  const blockSize = Math.min(subnetSize(mask), 65536) // cap at /16
  const base = parts.slice(0, 3).join('.')
  return { base, startOctet: 0, blockSize }
}
const GRID_PAGE_SIZE = 256
function gridColumns(mask: number): number {
  if (mask >= 28) return 4   // /28 = 16 addresses → 4 cols
  if (mask >= 27) return 8   // /27 = 32 addresses → 8 cols
  if (mask >= 26) return 8   // /26 = 64 addresses → 8 cols
  if (mask >= 25) return 16  // /25 = 128 addresses → 16 cols
  return 16                   // /24 and larger → 16 cols
}

const IPPlannerView = ({ searchTerm, selectedIpFilter = null, highlightId: _highlightId = null }: IPPlannerProps) => {
  const [subnets, setSubnets] = useState<SubnetWithRelations[]>([])
  const [selectedSubnet, setSelectedSubnet] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'summary'>('grid')
  const [gridPage, setGridPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [vlans, setVlans] = useState<{ id: string; vid: number; name: string }[]>([])
  const [devices, setDevices] = useState<Device[]>([])

  // Modals
  const [subnetModalOpen, setSubnetModalOpen] = useState(false)
  const [rangeModalOpen, setRangeModalOpen] = useState(false)
  const [ipModalOpen, setIpModalOpen] = useState(false)
  const [deleteSubnetModal, setDeleteSubnetModal] = useState(false)
  const [subnetForm, setSubnetForm] = useState(emptySubnetForm)
  const [editingSubnetId, setEditingSubnetId] = useState<string | null>(null)
  const [rangeForm, setRangeForm] = useState(emptyRangeForm)
  const [editingRangeId, setEditingRangeId] = useState<string | null>(null)
  const [ipForm, setIpForm] = useState(emptyIpForm)

  const [editingIpId, setEditingIpId] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    Promise.all([
      fetch('/api/subnets').then(r => r.json()),
      fetch('/api/vlans').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
    ]).then(([subnetData, vlanData, deviceData]) => {
      setSubnets(subnetData)
      setVlans(vlanData)
      setDevices(deviceData)
      setSelectedSubnet(prev => {
        if (prev && subnetData.some((s: SubnetWithRelations) => s.id === prev)) return prev
        return subnetData.length > 0 ? subnetData[0].id : null
      })
      setGridPage(0)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Escape key handler for all modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ipModalOpen) { setIpModalOpen(false); e.stopPropagation(); return }
        if (rangeModalOpen) { setRangeModalOpen(false); setEditingRangeId(null); e.stopPropagation(); return }
        if (subnetModalOpen) { setSubnetModalOpen(false); setEditingSubnetId(null); e.stopPropagation(); return }
        if (deleteSubnetModal) { setDeleteSubnetModal(false); e.stopPropagation(); return }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [ipModalOpen, rangeModalOpen, subnetModalOpen, deleteSubnetModal])

  const subnet = useMemo(() => subnets.find(s => s.id === selectedSubnet), [subnets, selectedSubnet])

  // Build a map of IP address -> device for quick lookup
  const ipToDevice = useMemo(() => {
    const map = new Map<string, Device>()
    devices.forEach(d => {
      if (d.ipAddress) map.set(d.ipAddress, d)
    })
    return map
  }, [devices])

  // Compute subnet block info
  const subnetBlock = useMemo(() => {
    if (!subnet) return { base: '', startOctet: 0, blockSize: 256 }
    return getSubnetBlock(subnet.prefix, subnet.mask)
  }, [subnet])

  const totalPages = useMemo(() => {
    if (!subnet) return 1
    return Math.max(1, Math.ceil(subnetBlock.blockSize / GRID_PAGE_SIZE))
  }, [subnet, subnetBlock])

  // Build lookup maps once for the whole subnet
  const subnetMaps = useMemo(() => {
    if (!subnet) return { ipMap: new Map<number, IPAddress>(), rangeMap: new Map<number, IPRange>() }
    const ipMap = new Map<number, IPAddress>()
    subnet.ipAddresses.forEach(ip => {
      const octet = parseInt(ip.address.split('.').pop() || '0')
      ipMap.set(octet, ip)
    })
    const rangeMap = new Map<number, IPRange>()
    subnet.ipRanges.forEach(range => {
      const start = parseInt(range.startAddr.split('.').pop() || '0')
      const end = parseInt(range.endAddr.split('.').pop() || '0')
      for (let i = start; i <= end; i++) rangeMap.set(i, range)
    })
    return { ipMap, rangeMap }
  }, [subnet])

  // Generate cells for the current page only (for grid view performance)
  const cellData = useMemo(() => {
    if (!subnet) return []
    const { base, startOctet, blockSize } = subnetBlock
    const { ipMap, rangeMap } = subnetMaps
    const cells = []
    const gatewayOctet = subnet.gateway ? parseInt(subnet.gateway.split('.').pop() || '1') : (startOctet + 1)
    const networkOctet = startOctet
    const broadcastOctet = startOctet + blockSize - 1
    const pageStart = startOctet + gridPage * GRID_PAGE_SIZE
    const pageEnd = Math.min(pageStart + GRID_PAGE_SIZE, startOctet + blockSize)
    for (let i = pageStart; i < pageEnd; i++) {
      const ip = ipMap.get(i)
      const range = rangeMap.get(i)
      const fullIp = `${base}.${i}`
      const device = ipToDevice.get(fullIp)
      const isGateway = i === gatewayOctet && !!subnet.gateway
      const isNetwork = i === networkOctet && subnet.mask < 31
      const isBroadcast = i === broadcastOctet && subnet.mask < 31
      let status: string
      if (isNetwork) status = 'network'
      else if (isBroadcast) status = 'broadcast'
      else if (isGateway) status = 'gateway'
      else if (ip) status = 'assigned'
      else if (device) status = 'assigned'
      else if (range) status = range.role
      else status = 'available'
      cells.push({ octet: i, fullIp, status, ip, range, device, isGateway })
    }
    return cells
  }, [subnet, ipToDevice, subnetBlock, subnetMaps, gridPage])

  // All cells for utilization/summary (computed from maps, not full array)
  const allCellStats = useMemo(() => {
    if (!subnet) return { assignedCount: 0, gatewayCount: 0 }
    const { startOctet, blockSize } = subnetBlock
    const { ipMap } = subnetMaps
    const gatewayOctet = subnet.gateway ? parseInt(subnet.gateway.split('.').pop() || '1') : (startOctet + 1)
    let assignedCount = 0
    let gatewayCount = 0
    for (let i = startOctet; i < startOctet + blockSize; i++) {
      const ip = ipMap.get(i)
      const fullIp = `${subnetBlock.base}.${i}`
      const device = ipToDevice.get(fullIp)
      const isGateway = i === gatewayOctet && !!subnet.gateway
      if (isGateway) gatewayCount++
      else if (ip || device) assignedCount++
    }
    return { assignedCount: assignedCount + gatewayCount, gatewayCount }
  }, [subnet, subnetBlock, subnetMaps, ipToDevice])

  const filteredCells = useMemo(() => {
    if (!searchTerm) return cellData
    return cellData.map(c => ({
      ...c,
      highlighted: c.ip?.dnsName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.fullIp.includes(searchTerm) ||
        c.ip?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.device?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    }))
  }, [cellData, searchTerm])

  const utilization = useMemo(() => {
    if (!subnet) return { used: 0, total: 254, pct: 0 }
    const total = usableHosts(subnet.mask)
    const used = allCellStats.assignedCount
    return { used, total, pct: total > 0 ? Math.round((used / total) * 100) : 0 }
  }, [subnet, allCellStats])

  // Subnet overlap detection
  const subnetOverlaps = useMemo(() => {
    const overlaps: { a: string; b: string; aDesc: string; bDesc: string }[] = []
    for (let i = 0; i < subnets.length; i++) {
      for (let j = i + 1; j < subnets.length; j++) {
        const sa = subnets[i], sb = subnets[j]
        const partsA = sa.prefix.split('.').map(Number)
        const partsB = sb.prefix.split('.').map(Number)
        const intA = ((partsA[0] << 24) | (partsA[1] << 16) | (partsA[2] << 8) | partsA[3]) >>> 0
        const intB = ((partsB[0] << 24) | (partsB[1] << 16) | (partsB[2] << 8) | partsB[3]) >>> 0
        const sizeA = Math.pow(2, 32 - sa.mask)
        const sizeB = Math.pow(2, 32 - sb.mask)
        const endA = intA + sizeA - 1
        const endB = intB + sizeB - 1
        if (intA <= endB && intB <= endA) {
          overlaps.push({
            a: `${sa.prefix}/${sa.mask}`, b: `${sb.prefix}/${sb.mask}`,
            aDesc: sa.description || 'Unnamed', bDesc: sb.description || 'Unnamed',
          })
        }
      }
    }
    return overlaps
  }, [subnets])

  // Subnet CRUD
  const handleSaveSubnet = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      prefix: subnetForm.prefix,
      mask: parseInt(subnetForm.mask),
      description: subnetForm.description || null,
      gateway: subnetForm.gateway || null,
      vlanId: subnetForm.vlanId || null,
      role: subnetForm.role || null,
      status: 'active',
    }
    const method = editingSubnetId ? 'PATCH' : 'POST'
    const url = editingSubnetId ? `/api/subnets/${editingSubnetId}` : '/api/subnets'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const saved = await res.json()
      setSubnetModalOpen(false)
      setSubnetForm(emptySubnetForm)
      setEditingSubnetId(null)
      fetchData()
      if (!editingSubnetId) setSelectedSubnet(saved.id)
    } else { alert(editingSubnetId ? 'Failed to update subnet' : 'Failed to create subnet') }
  }

  const openEditSubnet = () => {
    if (!subnet) return
    setEditingSubnetId(subnet.id)
    setSubnetForm({
      prefix: subnet.prefix,
      mask: String(subnet.mask),
      description: subnet.description || '',
      gateway: subnet.gateway || '',
      vlanId: subnet.vlan?.id || '',
      role: subnet.role || '',
    })
    setSubnetModalOpen(true)
  }

  const openCreateSubnet = () => {
    setEditingSubnetId(null)
    setSubnetForm(emptySubnetForm)
    setSubnetModalOpen(true)
  }

  const handleDeleteSubnet = async () => {
    if (!selectedSubnet) return
    const res = await fetch(`/api/subnets/${selectedSubnet}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteSubnetModal(false)
      setSelectedSubnet(null)
      fetchData()
    }
  }

  // IP Range CRUD
  const handleSaveRange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subnet) return
    const base = subnet.prefix.split('.').slice(0, 3).join('.')
    const method = editingRangeId ? 'PATCH' : 'POST'
    const url = editingRangeId ? `/api/ranges/${editingRangeId}` : '/api/ranges'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startAddr: `${base}.${rangeForm.startOctet}`,
        endAddr: `${base}.${rangeForm.endOctet}`,
        subnetId: subnet.id,
        role: rangeForm.role,
        description: rangeForm.description || null,
      }),
    })
    if (res.ok) {
      setRangeModalOpen(false)
      setRangeForm(emptyRangeForm)
      setEditingRangeId(null)
      fetchData()
    } else { alert(editingRangeId ? 'Failed to update range' : 'Failed to create range') }
  }

  const handleDeleteRange = async (rangeId: string) => {
    const res = await fetch(`/api/ranges/${rangeId}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  const openEditRange = (range: IPRange) => {
    setEditingRangeId(range.id)
    setRangeForm({
      startOctet: range.startAddr.split('.').pop() || '',
      endOctet: range.endAddr.split('.').pop() || '',
      role: range.role,
      description: range.description || '',
    })
    setRangeModalOpen(true)
  }

  const openCreateRange = () => {
    setEditingRangeId(null)
    setRangeForm(emptyRangeForm)
    setRangeModalOpen(true)
  }

  // IP Address assign/edit — supports both create (POST) and edit (PATCH)
  const handleAssignIp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subnet) return

    const newDevice = ipForm.deviceId ? devices.find(d => d.id === ipForm.deviceId) : null

    // Find the device currently linked to THIS IP address (the one we're editing)
    const deviceOnThisIp = devices.find(d => d.ipAddress === ipForm.address) || null

    // If the new device already has a DIFFERENT IP, we need to clean up that old assignment
    const newDeviceOldIp = newDevice?.ipAddress && newDevice.ipAddress !== ipForm.address
      ? newDevice.ipAddress : null

    const method = editingIpId ? 'PATCH' : 'POST'
    const url = editingIpId ? `/api/ipam/${editingIpId}` : '/api/ipam'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: ipForm.address,
        mask: subnet.mask,
        subnetId: subnet.id,
        status: ipForm.status,
        dnsName: ipForm.dnsName || (newDevice ? newDevice.name : null),
        description: ipForm.description || null,
        assignedTo: newDevice ? newDevice.name : null,
      }),
    })

    if (res.ok) {
      // 1) If the device on this IP changed or was removed, clear the OLD device's ipAddress
      if (deviceOnThisIp && deviceOnThisIp.id !== newDevice?.id) {
        await fetch(`/api/devices/${deviceOnThisIp.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ipAddress: '' }),
        })
      }

      // 2) If the new device had a different IP before, clean up that old IPAM record
      //    Search ALL subnets since the old IP might be on a different subnet
      if (newDeviceOldIp) {
        let oldIpamId: string | null = null
        for (const s of subnets) {
          const found = s.ipAddresses.find(ip => ip.address === newDeviceOldIp)
          if (found) { oldIpamId = found.id; break }
        }
        if (oldIpamId) {
          await fetch(`/api/ipam/${oldIpamId}`, { method: 'DELETE' })
        }
      }

      // 3) Link the new device to this IP (set device.ipAddress = this IP)
      if (newDevice) {
        await fetch(`/api/devices/${newDevice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ipAddress: ipForm.address }),
        })
      }

      setIpModalOpen(false)
      setIpForm(emptyIpForm)
      setEditingIpId(null)
      fetchData()
    } else { alert(editingIpId ? 'Failed to update IP' : 'Failed to assign IP') }
  }

  const handleDeleteIp = async (ipId: string, skipRefresh = false) => {
    const res = await fetch(`/api/ipam/${ipId}`, { method: 'DELETE' })
    if (res.ok && !skipRefresh) fetchData()
    return res.ok
  }

  // Unlink a device-only IP (no IPAM record — just clear the device's ipAddress)
  const handleUnlinkDevice = async (deviceId: string) => {
    const res = await fetch(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipAddress: '' }),
    })
    if (res.ok) fetchData()
  }

  // Create an IPAM record for a device-only IP so it can be managed
  const handlePromoteDeviceIp = (device: Device) => {
    if (!subnet) return
    setEditingIpId(null)
    setIpForm({
      address: device.ipAddress,
      dnsName: device.name,
      description: `Assigned to ${device.name}`,
      status: 'active',
      deviceId: device.id,
    })
    setIpModalOpen(true)
  }

  const openAssignFromGrid = (fullIp: string) => {
    setEditingIpId(null)
    setIpForm({ address: fullIp, dnsName: '', description: '', status: 'active', deviceId: '' })
    setIpModalOpen(true)
  }

  if (loading) return <div className="view-loading">Loading IP Planner...</div>

  const getCellColor = (status: string) => {
    switch (status) {
      case 'network': return { bg: '#1e293b', color: '#fff' }
      case 'broadcast': return { bg: '#1e293b', color: '#fff' }
      case 'gateway': return { bg: '#10b981', color: '#fff' }
      case 'assigned': return { bg: '#0055ff', color: '#fff' }
      case 'dhcp': return { bg: '#fef3c7', color: '#92400e' }
      case 'reserved': return { bg: '#ede9fe', color: '#5b21b6' }
      case 'infrastructure': return { bg: '#cffafe', color: '#155e75' }
      default: return { bg: '#f1f3f5', color: '#adb5bd' }
    }
  }

  // No subnets - empty state
  if (subnets.length === 0) {
    return (
      <div className="ipam-view animate-fade-in">
        <div className="empty-state">
          <Globe size={40} color="#cbd5e1" />
          <h3>No subnets configured</h3>
          <p>Create your first subnet to start planning IP addresses.</p>
          <Button onClick={openCreateSubnet}><Plus size={14} /> Create Subnet</Button>
        </div>
        {subnetModalOpen && renderSubnetModal()}
      </div>
    )
  }

  function renderSubnetModal() {
    return (
      <Dialog open={subnetModalOpen} onOpenChange={(open) => { if (!open) { setSubnetModalOpen(false); setEditingSubnetId(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubnetId ? 'Edit Subnet' : 'Create Subnet'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSubnet}>
            <div className="grid grid-cols-[2fr_1fr] gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Network Prefix</Label>
                <Input required value={subnetForm.prefix} onChange={e => setSubnetForm({ ...subnetForm, prefix: e.target.value })} placeholder="e.g. 10.0.10.0" className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Mask</Label>
                <select className="unifi-input" value={subnetForm.mask} onChange={e => setSubnetForm({ ...subnetForm, mask: e.target.value })}>
                  <option value="8">/8 (16.7M hosts)</option>
                  <option value="16">/16 (65,534 hosts)</option>
                  <option value="20">/20 (4,094 hosts)</option>
                  <option value="22">/22 (1,022 hosts)</option>
                  <option value="23">/23 (510 hosts)</option>
                  <option value="24">/24 (254 hosts)</option>
                  <option value="25">/25 (126 hosts)</option>
                  <option value="26">/26 (62 hosts)</option>
                  <option value="27">/27 (30 hosts)</option>
                  <option value="28">/28 (14 hosts)</option>
                  <option value="29">/29 (6 hosts)</option>
                  <option value="30">/30 (2 hosts)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Gateway</Label>
                <Input value={subnetForm.gateway} onChange={e => setSubnetForm({ ...subnetForm, gateway: e.target.value })} placeholder="e.g. 10.0.10.1" className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">VLAN</Label>
                <select className="unifi-input" value={subnetForm.vlanId} onChange={e => setSubnetForm({ ...subnetForm, vlanId: e.target.value })}>
                  <option value="">None</option>
                  {vlans.map(v => <option key={v.id} value={v.id}>VLAN {v.vid} — {v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Role</Label>
                <select className="unifi-input" value={subnetForm.role} onChange={e => setSubnetForm({ ...subnetForm, role: e.target.value })}>
                  <option value="">None</option>
                  <option value="production">Production</option>
                  <option value="management">Management</option>
                  <option value="iot">IoT</option>
                  <option value="guest">Guest</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
                <Input value={subnetForm.description} onChange={e => setSubnetForm({ ...subnetForm, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px]" />
              </div>
            </div>
            <DialogFooter className="mt-8">
              <Button type="button" variant="outline" onClick={() => { setSubnetModalOpen(false); setEditingSubnetId(null) }}>Cancel</Button>
              <Button type="submit">{editingSubnetId ? 'Save Changes' : 'Create Subnet'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="ipam-view animate-fade-in">
      {/* Toolbar */}
      <div className="ipam-toolbar">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className="ipam-subnet-selector">
            <label className="input-label mb-0">Subnet</label>
            <select className="unifi-input" value={selectedSubnet || ''} onChange={e => { setSelectedSubnet(e.target.value); setGridPage(0) }}>
              {subnets.map(s => (
                <option key={s.id} value={s.id}>{s.prefix}/{s.mask} — {s.description || 'Unnamed'} {s.vlan ? `(VLAN ${s.vlan.vid})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="ipam-util-section">
            <div className="ipam-util-header">
              <span className="ipam-util-label">Utilization</span>
              <span className="ipam-util-pct" style={{ color: utilization.pct > 80 ? '#ef4444' : utilization.pct > 50 ? '#f59e0b' : '#10b981' }}>{utilization.pct}%</span>
            </div>
            <div className="ipam-util-bar">
              <div className="ipam-util-fill" style={{ width: `${utilization.pct}%`, background: utilization.pct > 80 ? '#ef4444' : utilization.pct > 50 ? '#f59e0b' : '#10b981' }} />
            </div>
            <span className="ipam-util-detail">{utilization.used} / {utilization.total} addresses used</span>
          </div>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <div className="ipam-view-toggle">
            <button className={`ipam-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View"><LayoutGrid size={14} /></button>
            <button className={`ipam-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List View"><List size={14} /></button>
            <button className={`ipam-toggle-btn ${viewMode === 'summary' ? 'active' : ''}`} onClick={() => setViewMode('summary')} title="Summary"><BarChart3 size={14} /></button>
          </div>
          <div className="w-px h-6 bg-border mx-1" />
          <Button onClick={openCreateSubnet}><Plus size={14} /> Subnet</Button>
          {subnet && <Button variant="outline" onClick={openEditSubnet} title="Edit Subnet"><Edit2 size={14} /></Button>}
          {subnet && <Button variant="outline" onClick={openCreateRange}><Plus size={14} /> Range</Button>}
          {subnet && <Button variant="ghost" className="text-(--red) hover:text-(--red)" onClick={() => setDeleteSubnetModal(true)}><Trash2 size={14} /></Button>}
        </div>
      </div>

      {/* Subnet Overlap Warnings */}
      {subnetOverlaps.length > 0 && (
        <div className="mb-3 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-[#dc2626]" />
            <span className="font-semibold text-[13px] text-[#dc2626]">Subnet Overlap Detected ({subnetOverlaps.length})</span>
          </div>
          <div className="flex flex-col gap-1">
            {subnetOverlaps.map((o, i) => (
              <div key={i} className="text-xs text-[#991b1b] flex gap-1.5 items-center">
                <code className="bg-[#fee2e2] px-1.5 py-px rounded text-[11px]">{o.a}</code>
                <span>({o.aDesc})</span>
                <span className="text-[#dc2626]">overlaps with</span>
                <code className="bg-[#fee2e2] px-1.5 py-px rounded text-[11px]">{o.b}</code>
                <span>({o.bDesc})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IP Range Legend */}
      {subnet && subnet.ipRanges.length > 0 && (
        <div className="ipam-ranges-bar">
          {subnet.ipRanges.map((r, i) => {
            const rc = rangeColors[r.role] || rangeColors.general
            return (
              <div key={i} className="ipam-range-tag" style={{ background: rc.bg, borderColor: rc.border }}>
                <div className="ipam-range-dot" style={{ background: rc.border }} />
                <span>{rc.label}: .{r.startAddr.split('.').pop()} — .{r.endAddr.split('.').pop()}</span>
                {r.description && <span className="ipam-range-desc">{r.description}</span>}
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" style={{ color: rc.border }} onClick={() => openEditRange(r)} title="Edit Range"><Edit2 size={11} /></Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-(--red)" onClick={() => handleDeleteRange(r.id)} title="Delete Range"><Trash2 size={11} /></Button>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ GRID VIEW ═══ */}
      {viewMode === 'grid' && subnet && (
        <>
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-card border border-border rounded-lg">
              <span className="text-xs text-muted-foreground">
                Showing addresses <strong>{subnetBlock.startOctet + gridPage * GRID_PAGE_SIZE}</strong> — <strong>{Math.min(subnetBlock.startOctet + (gridPage + 1) * GRID_PAGE_SIZE - 1, subnetBlock.startOctet + subnetBlock.blockSize - 1)}</strong> of <strong>{subnetBlock.blockSize}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled={gridPage === 0} onClick={() => setGridPage(p => p - 1)}><ChevronLeft size={14} /> Prev</Button>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    const pageIdx = totalPages <= 10 ? i : (
                      gridPage < 5 ? i :
                      gridPage > totalPages - 6 ? totalPages - 10 + i :
                      gridPage - 4 + i
                    )
                    return (
                      <button key={pageIdx} className={`px-2 py-1 text-[11px] rounded min-w-7 ${pageIdx === gridPage ? 'bg-[#0055ff] text-white font-bold' : 'bg-transparent hover:bg-accent'}`} onClick={() => setGridPage(pageIdx)}>{pageIdx + 1}</button>
                    )
                  })}
                  {totalPages > 10 && <span className="text-[11px] text-(--text-light) p-1">of {totalPages}</span>}
                </div>
                <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled={gridPage >= totalPages - 1} onClick={() => setGridPage(p => p + 1)}>Next <ChevronRight size={14} /></Button>
              </div>
            </div>
          )}

          <div className="ipam-grid-container">
            <div className="ipam-grid" style={{ gridTemplateColumns: `repeat(${gridColumns(subnet.mask)}, 1fr)` }}>
              {filteredCells.map((cell) => {
                const colors = getCellColor(cell.status)
                const isHighlighted = 'highlighted' in cell && cell.highlighted
                const ipFilterDimmed = selectedIpFilter ? cell.status !== selectedIpFilter : false
                const dimmed = (searchTerm && !isHighlighted && cell.status !== 'gateway') || ipFilterDimmed
                const label = cell.device?.name || cell.ip?.dnsName || cell.ip?.assignedTo
                return (
                  <div
                    key={cell.octet}
                    className={`ipam-cell ${cell.status} ${isHighlighted ? 'highlighted' : ''} ${dimmed ? 'dimmed' : ''}`}
                    style={{ background: colors.bg, color: colors.color, opacity: dimmed ? 0.25 : 1, cursor: (cell.status !== 'network' && cell.status !== 'broadcast') ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredCell(cell.octet)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => {
                      if (cell.status === 'available' || cell.status === 'dhcp' || cell.status === 'reserved' || cell.status === 'infrastructure') {
                        openAssignFromGrid(cell.fullIp)
                      } else if (cell.ip) {
                        const linkedDev = cell.device || devices.find(d => d.ipAddress === cell.ip!.address)
                        setEditingIpId(cell.ip.id)
                        setIpForm({ address: cell.ip.address, dnsName: cell.ip.dnsName || '', description: cell.ip.description || '', status: cell.ip.status, deviceId: linkedDev?.id || '' })
                        setIpModalOpen(true)
                      } else if (cell.device && !cell.ip) {
                        setEditingIpId(null)
                        setIpForm({ address: cell.fullIp, dnsName: cell.device.name, description: `Assigned to ${cell.device.name}`, status: 'active', deviceId: cell.device.id })
                        setIpModalOpen(true)
                      }
                    }}
                  >
                    <span className="ipam-cell-num">{cell.octet}</span>
                    {label && (
                      <span className="ipam-cell-label">{label.length > 6 ? label.slice(0, 6) + '…' : label}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredCell !== null && (() => {
            const cell = cellData.find(c => c.octet === hoveredCell)
            if (!cell) return null
            return (
              <div className="ipam-tooltip">
                <Info size={12} />
                <div className="ipam-tooltip-content">
                  <strong>{cell.fullIp}</strong>
                  {cell.isGateway && <span className="badge badge-green">Gateway</span>}
                  {cell.device && <span><Server size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{cell.device.name}</span>}
                  {cell.ip && !cell.device && <span>{cell.ip.dnsName || cell.ip.assignedTo || 'Unnamed'}</span>}
                  {cell.ip?.description && <span className="ipam-tooltip-desc">{cell.ip.description}</span>}
                  {!cell.ip && !cell.device && cell.range && <span className={`badge badge-${cell.range.role === 'dhcp' ? 'orange' : cell.range.role === 'reserved' ? 'purple' : 'blue'}`}>{cell.range.role} range</span>}
                  {(cell.status === 'available' || cell.status === 'dhcp' || cell.status === 'reserved' || cell.status === 'infrastructure') && !cell.ip && !cell.device && <span className="ipam-tooltip-action">Click to assign</span>}
                  {(cell.ip || cell.device) && cell.status === 'assigned' && <span className="ipam-tooltip-action">Click to edit / unassign</span>}
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {viewMode === 'list' && subnet && (
        <div className="ipam-list-view">
          <table className="unifi-table">
            <thead>
              <tr>
                <th className="w-[60px]">#</th>
                <th className="w-[140px]">IP Address</th>
                <th className="w-[100px]">Status</th>
                <th className="w-40">Device / DNS</th>
                <th className="w-[120px]">Range</th>
                <th>Description</th>
                <th className="w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCells.filter(c => c.status !== 'available' || searchTerm).slice(0, searchTerm ? undefined : 256).map(cell => {
                const isHighlighted = 'highlighted' in cell && cell.highlighted
                const dimmed = searchTerm && !isHighlighted
                const label = cell.device?.name || cell.ip?.dnsName || cell.ip?.assignedTo
                const colors = getCellColor(cell.status)
                return (
                  <tr key={cell.octet} style={{ opacity: dimmed ? 0.3 : 1 }}>
                    <td><span className="font-semibold text-[11px] text-(--text-light)">.{cell.octet}</span></td>
                    <td><code className="text-[11px] bg-(--muted-bg) px-1.5 py-px rounded">{cell.fullIp}</code></td>
                    <td>
                      <span className="ipam-list-status" style={{ background: colors.bg, color: colors.color }}>
                        {cell.status === 'gateway' ? 'Gateway' : cell.status === 'assigned' ? 'Assigned' : cell.status === 'network' ? 'Network' : cell.status === 'broadcast' ? 'Broadcast' : cell.range ? rangeColors[cell.range.role]?.label || cell.range.role : 'Available'}
                      </span>
                    </td>
                    <td className="font-medium">
                      {cell.device ? (
                        <span className="flex items-center gap-1">
                          <Server size={11} color="#0055ff" />
                          {cell.device.name}
                        </span>
                      ) : label ? label : '—'}
                    </td>
                    <td className="text-[11px] text-(--text-light)">
                      {cell.range ? `${rangeColors[cell.range.role]?.label || cell.range.role}: .${cell.range.startAddr.split('.').pop()}–.${cell.range.endAddr.split('.').pop()}` : '—'}
                    </td>
                    <td className="text-muted-foreground text-xs">{cell.ip?.description || '—'}</td>
                    <td className="text-right">
                      {cell.ip && (
                        <div className="flex gap-0.5 justify-end">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#0055ff]" onClick={() => { setEditingIpId(cell.ip!.id); const dev = cell.device || devices.find(d => d.ipAddress === cell.ip!.address); setIpForm({ address: cell.ip!.address, dnsName: cell.ip!.dnsName || '', description: cell.ip!.description || '', status: cell.ip!.status, deviceId: dev?.id || '' }); setIpModalOpen(true) }} title="Edit"><Edit2 size={12} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-(--red)" onClick={() => handleDeleteIp(cell.ip!.id)} title="Delete"><Trash2 size={12} /></Button>
                        </div>
                      )}
                      {!cell.ip && cell.device && (
                        <div className="flex gap-0.5 justify-end">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#0055ff]" onClick={() => handlePromoteDeviceIp(cell.device!)} title="Manage in IPAM"><Edit2 size={12} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-(--red)" onClick={() => handleUnlinkDevice(cell.device!.id)} title="Unlink IP"><Trash2 size={12} /></Button>
                        </div>
                      )}
                      {!cell.ip && !cell.device && cell.status !== 'network' && cell.status !== 'broadcast' && cell.status !== 'gateway' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-[#0055ff]" onClick={() => openAssignFromGrid(cell.fullIp)}><Plus size={12} /></Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ SUMMARY VIEW ═══ */}
      {viewMode === 'summary' && subnet && (() => {
        const statusCounts: Record<string, number> = {}
        const deviceCount = cellData.filter(c => c.device).length
        const ipamCount = cellData.filter(c => c.ip && !c.device).length
        cellData.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1 })
        const rangeSummary = subnet.ipRanges.map(r => {
          const start = parseInt(r.startAddr.split('.').pop() || '0')
          const end = parseInt(r.endAddr.split('.').pop() || '0')
          const total = end - start + 1
          const used = cellData.filter(c => c.octet >= start && c.octet <= end && (c.ip || c.device)).length
          return { ...r, total, used, pct: Math.round((used / total) * 100) }
        })
        return (
          <div className="ipam-summary-view">
            {/* Stats Cards — consistent with all views */}
            <div className="dash-stat-grid grid-cols-4">
              <div className="dash-stat-card">
                <div className="dash-stat-label">Used Addresses</div>
                <div className="dash-stat-value text-[#0055ff]">{utilization.used}</div>
                <div className="text-[10px] text-(--text-light)">{utilization.pct}% of {utilization.total}</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-label">Available</div>
                <div className="dash-stat-value text-[#10b981]">{statusCounts['available'] || 0}</div>
                <div className="text-[10px] text-(--text-light)">Ready to assign</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-label">Devices</div>
                <div className="dash-stat-value text-[#7c3aed]">{deviceCount}</div>
                <div className="text-[10px] text-(--text-light)">Linked to IPs</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-label">Manual IPs</div>
                <div className="dash-stat-value text-[#f59e0b]">{ipamCount}</div>
                <div className="text-[10px] text-(--text-light)">No device linked</div>
              </div>
            </div>

            {/* Subnet Info */}
            <div className="ipam-summary-section">
              <h3 className="ipam-summary-section-title">Subnet Details</h3>
              <div className="ipam-summary-details">
                <div className="ipam-summary-detail-row">
                  <span className="ipam-summary-detail-label">Network</span>
                  <code>{subnet.prefix}/{subnet.mask}</code>
                </div>
                {subnet.gateway && (
                  <div className="ipam-summary-detail-row">
                    <span className="ipam-summary-detail-label">Gateway</span>
                    <code>{subnet.gateway}</code>
                  </div>
                )}
                {subnet.vlan && (
                  <div className="ipam-summary-detail-row">
                    <span className="ipam-summary-detail-label">VLAN</span>
                    <span>VLAN {subnet.vlan.vid} — {subnet.vlan.name}</span>
                  </div>
                )}
                {subnet.role && (
                  <div className="ipam-summary-detail-row">
                    <span className="ipam-summary-detail-label">Role</span>
                    <span className="badge" style={{ textTransform: 'capitalize' }}>{subnet.role}</span>
                  </div>
                )}
                {subnet.description && (
                  <div className="ipam-summary-detail-row">
                    <span className="ipam-summary-detail-label">Description</span>
                    <span>{subnet.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Address Breakdown Bar */}
            <div className="ipam-summary-section">
              <h3 className="ipam-summary-section-title">Address Breakdown</h3>
              <div className="ipam-breakdown-bar">
                {statusCounts['gateway'] && <div className="ipam-breakdown-seg" style={{ flex: statusCounts['gateway'], background: '#10b981' }} title={`Gateway: ${statusCounts['gateway']}`} />}
                {statusCounts['assigned'] && <div className="ipam-breakdown-seg" style={{ flex: statusCounts['assigned'], background: '#0055ff' }} title={`Assigned: ${statusCounts['assigned']}`} />}
                {statusCounts['dhcp'] && <div className="ipam-breakdown-seg" style={{ flex: statusCounts['dhcp'], background: '#f59e0b' }} title={`DHCP: ${statusCounts['dhcp']}`} />}
                {statusCounts['reserved'] && <div className="ipam-breakdown-seg" style={{ flex: statusCounts['reserved'], background: '#8b5cf6' }} title={`Reserved: ${statusCounts['reserved']}`} />}
                {statusCounts['infrastructure'] && <div className="ipam-breakdown-seg" style={{ flex: statusCounts['infrastructure'], background: '#06b6d4' }} title={`Infrastructure: ${statusCounts['infrastructure']}`} />}
                {statusCounts['available'] && <div className="ipam-breakdown-seg" style={{ flex: statusCounts['available'], background: '#e2e8f0' }} title={`Available: ${statusCounts['available']}`} />}
              </div>
              <div className="ipam-breakdown-legend">
                {statusCounts['gateway'] && <span><span className="ipam-breakdown-dot" style={{ background: '#10b981' }} /> Gateway ({statusCounts['gateway']})</span>}
                {statusCounts['assigned'] && <span><span className="ipam-breakdown-dot" style={{ background: '#0055ff' }} /> Assigned ({statusCounts['assigned']})</span>}
                {statusCounts['dhcp'] && <span><span className="ipam-breakdown-dot" style={{ background: '#f59e0b' }} /> DHCP ({statusCounts['dhcp']})</span>}
                {statusCounts['reserved'] && <span><span className="ipam-breakdown-dot" style={{ background: '#8b5cf6' }} /> Reserved ({statusCounts['reserved']})</span>}
                {statusCounts['infrastructure'] && <span><span className="ipam-breakdown-dot" style={{ background: '#06b6d4' }} /> Infrastructure ({statusCounts['infrastructure']})</span>}
                <span><span className="ipam-breakdown-dot" style={{ background: '#e2e8f0' }} /> Available ({statusCounts['available'] || 0})</span>
              </div>
            </div>

            {/* Range Utilization */}
            {rangeSummary.length > 0 && (
              <div className="ipam-summary-section">
                <h3 className="ipam-summary-section-title">Range Utilization</h3>
                {rangeSummary.map((r, i) => {
                  const rc = rangeColors[r.role] || rangeColors.general
                  return (
                    <div key={i} className="ipam-range-summary-row">
                      <div className="ipam-range-summary-header">
                        <span className="font-semibold text-xs">{rc.label}: .{r.startAddr.split('.').pop()} — .{r.endAddr.split('.').pop()}</span>
                        <span className="text-[11px] text-(--text-light)">{r.used}/{r.total} used ({r.pct}%)</span>
                      </div>
                      <div className="ipam-util-bar h-1.5">
                        <div className="ipam-util-fill" style={{ width: `${r.pct}%`, background: rc.border }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Devices on this subnet */}
            {deviceCount > 0 && (
              <div className="ipam-summary-section">
                <h3 className="ipam-summary-section-title">Devices on this Subnet</h3>
                <div className="ipam-summary-devices">
                  {cellData.filter(c => c.device).map(c => (
                    <div key={c.octet} className="ipam-summary-device-row">
                      <Server size={13} color="#0055ff" />
                      <span className="font-medium">{c.device!.name}</span>
                      <code className="text-[10px] text-(--text-light) ml-auto">{c.fullIp}</code>
                      <span className={`badge badge-${c.device!.status === 'active' ? 'green' : 'orange'} text-[9px]`}>{c.device!.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Address Table (shown in grid mode only) */}
      {viewMode === 'grid' && subnet && (() => {
        // Build combined assigned list: IPAM records + device-only IPs on this subnet
        const ipamAddresses = new Set(subnet.ipAddresses.map(ip => ip.address))
        const { base, startOctet, blockSize } = subnetBlock
        const deviceOnlyEntries = devices.filter(d => {
          if (!d.ipAddress) return false
          if (ipamAddresses.has(d.ipAddress)) return false
          const parts = d.ipAddress.split('.')
          if (parts.slice(0, 3).join('.') !== base) return false
          const lastOctet = parseInt(parts[3] || '0')
          return lastOctet >= startOctet && lastOctet < startOctet + blockSize
        })
        const totalAssigned = subnet.ipAddresses.length + deviceOnlyEntries.length
        return (
          <div className="ipam-table-section">
            <div className="dash-section-header">
              <h2>Assigned Addresses</h2>
              <div className="flex gap-2 items-center">
                <span className="dash-section-badge">{totalAssigned} addresses</span>
                <Button size="sm" className="h-7 px-2.5 text-[11px]" onClick={() => { setEditingIpId(null); setIpForm({ address: `${base}.`, dnsName: '', description: '', status: 'active', deviceId: '' }); setIpModalOpen(true) }}><Plus size={12} /> Assign IP</Button>
              </div>
            </div>
            {totalAssigned === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-[13px]">No IP addresses assigned yet. Click a cell in the grid or use the button above.</div>
            ) : (
              <table className="unifi-table">
                <thead>
                  <tr>
                    <th className="w-[140px]">Address</th>
                    <th className="w-40">Device / DNS</th>
                    <th className="w-[100px]">Status</th>
                    <th>Description</th>
                    <th className="w-20 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subnet.ipAddresses
                    .sort((a, b) => parseInt(a.address.split('.').pop() || '0') - parseInt(b.address.split('.').pop() || '0'))
                    .map(ip => {
                      const linkedDevice = ipToDevice.get(ip.address)
                      return (
                        <tr key={ip.id}>
                          <td><code className="text-[11px] bg-(--muted-bg) px-1.5 py-px rounded">{ip.address}/{ip.mask}</code></td>
                          <td className="font-medium">
                            {linkedDevice ? (
                              <span className="flex items-center gap-1">
                                <Server size={11} color="#0055ff" />
                                {linkedDevice.name}
                              </span>
                            ) : (
                              ip.dnsName || ip.assignedTo || '—'
                            )}
                          </td>
                          <td><span className="badge badge-green">{ip.status}</span></td>
                          <td className="text-muted-foreground">{ip.description || '—'}</td>
                          <td className="text-right pr-2">
                            <div className="flex gap-0.5 justify-end">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-[#0055ff]" onClick={() => { setEditingIpId(ip.id); const dev = linkedDevice || devices.find(d => d.ipAddress === ip.address); setIpForm({ address: ip.address, dnsName: ip.dnsName || '', description: ip.description || '', status: ip.status, deviceId: dev?.id || '' }); setIpModalOpen(true) }} title="Edit"><Edit2 size={12} /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-(--red)" onClick={() => handleDeleteIp(ip.id)} title="Delete"><Trash2 size={12} /></Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  {deviceOnlyEntries.map(d => (
                    <tr key={`dev-${d.id}`}>
                      <td><code className="text-[11px] bg-(--muted-bg) px-1.5 py-px rounded">{d.ipAddress}/{subnet.mask}</code></td>
                      <td className="font-medium">
                        <span className="flex items-center gap-1">
                          <Server size={11} color="#0055ff" />
                          {d.name}
                        </span>
                      </td>
                      <td><span className={`badge badge-${d.status === 'active' ? 'green' : 'orange'}`}>{d.status}</span></td>
                      <td className="text-muted-foreground">{d.category} — {d.platform || 'No platform'}</td>
                      <td className="text-right pr-2">
                        <div className="flex gap-0.5 justify-end">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#0055ff]" onClick={() => handlePromoteDeviceIp(d)} title="Manage in IPAM"><Edit2 size={12} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-(--red)" onClick={() => handleUnlinkDevice(d.id)} title="Unlink IP from device"><Trash2 size={12} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })()}

      {/* Subnet Create Modal */}
      {subnetModalOpen && renderSubnetModal()}

      {/* Range Create Modal */}
      <Dialog open={rangeModalOpen && !!subnet} onOpenChange={(open) => { if (!open) { setRangeModalOpen(false); setEditingRangeId(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRangeId ? 'Edit' : 'Add'} IP Range {editingRangeId ? '' : `to ${subnet?.prefix}/${subnet?.mask}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRange}>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Start Octet (.x)</Label>
                <Input required type="number" min={1} max={254} value={rangeForm.startOctet} onChange={e => setRangeForm({ ...rangeForm, startOctet: e.target.value })} placeholder="e.g. 150" className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">End Octet (.x)</Label>
                <Input required type="number" min={1} max={254} value={rangeForm.endOctet} onChange={e => setRangeForm({ ...rangeForm, endOctet: e.target.value })} placeholder="e.g. 199" className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Role</Label>
                <select className="unifi-input" value={rangeForm.role} onChange={e => setRangeForm({ ...rangeForm, role: e.target.value })}>
                  <option value="dhcp">DHCP Pool</option>
                  <option value="reserved">Reserved</option>
                  <option value="infrastructure">Infrastructure</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
                <Input value={rangeForm.description} onChange={e => setRangeForm({ ...rangeForm, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px]" />
              </div>
            </div>
            <DialogFooter className="mt-8">
              <Button type="button" variant="outline" onClick={() => { setRangeModalOpen(false); setEditingRangeId(null) }}>Cancel</Button>
              <Button type="submit">{editingRangeId ? 'Save Changes' : 'Add Range'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* IP Assign/Edit Modal — with device linking */}
      <Dialog open={ipModalOpen && !!subnet} onOpenChange={(open) => { if (!open) { setIpModalOpen(false); setEditingIpId(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIpId ? 'Edit IP Address' : 'Assign IP Address'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignIp}>
            <div className="space-y-1.5 mb-4">
              <Label className="text-xs font-semibold text-muted-foreground">Link to Device (Optional)</Label>
              <select className="unifi-input" value={ipForm.deviceId} onChange={e => {
                const dev = devices.find(d => d.id === e.target.value)
                if (dev) {
                  setIpForm({
                    ...ipForm,
                    deviceId: e.target.value,
                    dnsName: dev.name,
                    description: `Assigned to ${dev.name}`,
                  })
                } else {
                  setIpForm({
                    ...ipForm,
                    deviceId: '',
                    dnsName: '',
                    description: '',
                  })
                }
              }}>
                <option value="">{editingIpId ? '— Unassign device —' : 'No device — manual assignment'}</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.ipAddress || 'no IP'}) — {d.category}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">IP Address</Label>
                <Input required value={ipForm.address} onChange={e => setIpForm({ ...ipForm, address: e.target.value })} placeholder="e.g. 10.0.10.20" className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">DNS Name</Label>
                <Input value={ipForm.dnsName} onChange={e => setIpForm({ ...ipForm, dnsName: e.target.value })} placeholder="e.g. my-server" className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
              <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
              <Input value={ipForm.description} onChange={e => setIpForm({ ...ipForm, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px]" />
            </div>
            <div className="flex gap-4 mt-8 justify-end items-center">
              {editingIpId && (
                <Button type="button" variant="destructive" size="sm" className="mr-auto text-xs" onClick={async () => {
                  const id = editingIpId
                  setIpModalOpen(false)
                  setEditingIpId(null)
                  setIpForm(emptyIpForm)
                  await handleDeleteIp(id)
                }}>
                  <Trash2 size={12} className="mr-1" /> Delete IP
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => { setIpModalOpen(false); setEditingIpId(null) }}>Cancel</Button>
              <Button type="submit">{editingIpId ? 'Save Changes' : 'Assign IP'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Subnet Modal */}
      <Dialog open={deleteSubnetModal} onOpenChange={setDeleteSubnetModal}>
        <DialogContent className="max-w-[400px] text-center">
          <DialogHeader className="flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fee2e2] text-[#dc2626]">
              <Trash2 size={24} />
            </div>
            <DialogTitle className="text-lg font-semibold">Delete Subnet?</DialogTitle>
            <DialogDescription className="mt-2">
              This will remove the subnet and all associated IP addresses and ranges.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-4 sm:justify-center mt-4">
            <Button variant="outline" onClick={() => setDeleteSubnetModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSubnet}>Delete Subnet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IPPlannerView
