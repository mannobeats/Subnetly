'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { IPAddress, IPRange, Device, SubnetTemplate as PersistedSubnetTemplate, IPRangeScheme } from '@/types'
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
}

interface SubnetTemplateOption {
  id: string
  name: string
  prefix: string
  mask: string
  gateway: string
  role: string
  description: string
  source: 'default' | 'custom'
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
const APP_SETTINGS_KEY = 'subnetly-settings'
const LEGACY_APP_SETTINGS_KEY = 'homelab-settings'

const defaultSubnetTemplates: SubnetTemplateOption[] = [
  {
    id: 'home-lan',
    name: 'Home LAN',
    prefix: '192.168.1.0',
    mask: '24',
    gateway: '192.168.1.1',
    role: 'production',
    description: 'Primary user and workstation network',
    source: 'default',
  },
  {
    id: 'iot-segment',
    name: 'IoT Segment',
    prefix: '192.168.20.0',
    mask: '24',
    gateway: '192.168.20.1',
    role: 'iot',
    description: 'Smart home and unmanaged IoT devices',
    source: 'default',
  },
  {
    id: 'guest-network',
    name: 'Guest WiFi',
    prefix: '192.168.50.0',
    mask: '24',
    gateway: '192.168.50.1',
    role: 'guest',
    description: 'Isolated guest access network',
    source: 'default',
  },
  {
    id: 'management',
    name: 'Infrastructure Mgmt',
    prefix: '10.0.10.0',
    mask: '24',
    gateway: '10.0.10.1',
    role: 'management',
    description: 'Switches, hypervisors, and core services',
    source: 'default',
  },
]

function isValidIPv4(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => {
    if (part === '' || Number.isNaN(Number(part))) return false
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

function ipToInt(ip: string): number {
  const [a, b, c, d] = ip.split('.').map(Number)
  return (((a << 24) | (b << 16) | (c << 8) | d) >>> 0)
}

function intToIp(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join('.')
}

function suggestGatewayFromPrefix(prefix: string, mask: number): string {
  if (!isValidIPv4(prefix)) return ''
  if (mask < 1 || mask > 30) return ''
  const maskBits = ((0xffffffff << (32 - mask)) >>> 0)
  const network = ipToInt(prefix) & maskBits
  return intToIp((network + 1) >>> 0)
}

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

const IPPlannerView = ({ searchTerm, selectedIpFilter = null }: IPPlannerProps) => {
  const [subnets, setSubnets] = useState<SubnetWithRelations[]>([])
  const [selectedSubnet, setSelectedSubnet] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'summary'>('grid')
  const [gridPage, setGridPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [vlans, setVlans] = useState<{ id: string; vid: number; name: string }[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [customSubnetTemplates, setCustomSubnetTemplates] = useState<PersistedSubnetTemplate[]>([])
  const [rangeSchemes, setRangeSchemes] = useState<IPRangeScheme[]>([])

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
  const [subnetTemplatesEnabled, setSubnetTemplatesEnabled] = useState(true)
  const [smartGatewayEnabled, setSmartGatewayEnabled] = useState(true)
  const [rangeSchemesEnabled, setRangeSchemesEnabled] = useState(true)
  const [selectedSubnetTemplate, setSelectedSubnetTemplate] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [saveSchemeModalOpen, setSaveSchemeModalOpen] = useState(false)
  const [applySchemeModalOpen, setApplySchemeModalOpen] = useState(false)
  const [newSchemeName, setNewSchemeName] = useState('')
  const [newSchemeDescription, setNewSchemeDescription] = useState('')
  const [selectedSchemeId, setSelectedSchemeId] = useState('')
  const [replaceExistingRanges, setReplaceExistingRanges] = useState(true)

  const fetchData = useCallback(() => {
    Promise.all([
      fetch('/api/subnets').then(r => r.json()),
      fetch('/api/vlans').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
      fetch('/api/subnet-templates').then(r => r.ok ? r.json() : []),
      fetch('/api/range-schemes').then(r => r.ok ? r.json() : []),
    ]).then(([subnetData, vlanData, deviceData, subnetTemplateData, rangeSchemeData]) => {
      setSubnets(subnetData)
      setVlans(vlanData)
      setDevices(deviceData)
      setCustomSubnetTemplates(Array.isArray(subnetTemplateData) ? subnetTemplateData : [])
      setRangeSchemes(Array.isArray(rangeSchemeData) ? rangeSchemeData : [])
      setSelectedSubnet(prev => {
        if (prev && subnetData.some((s: SubnetWithRelations) => s.id === prev)) return prev
        return subnetData.length > 0 ? subnetData[0].id : null
      })
      setGridPage(0)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem(APP_SETTINGS_KEY) ?? localStorage.getItem(LEGACY_APP_SETTINGS_KEY)
        if (!saved) return
        const settings = JSON.parse(saved)
        if (settings.ipamSubnetTemplatesEnabled !== undefined) {
          setSubnetTemplatesEnabled(!!settings.ipamSubnetTemplatesEnabled)
        }
        if (settings.ipamSmartGatewayEnabled !== undefined) {
          setSmartGatewayEnabled(!!settings.ipamSmartGatewayEnabled)
        }
        if (settings.ipamRangeSchemesEnabled !== undefined) {
          setRangeSchemesEnabled(!!settings.ipamRangeSchemesEnabled)
        }
      } catch {
        // Ignore malformed local settings
      }
    }

    loadSettings()
    window.addEventListener('storage', loadSettings)
    return () => window.removeEventListener('storage', loadSettings)
  }, [])

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

  const subnetTemplateOptions = useMemo<SubnetTemplateOption[]>(() => {
    const custom = customSubnetTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      prefix: template.prefix,
      mask: String(template.mask),
      gateway: template.gateway || '',
      role: template.role || '',
      description: template.description || '',
      source: 'custom' as const,
    }))
    return [...defaultSubnetTemplates, ...custom]
  }, [customSubnetTemplates])

  const rangeRoleSuggestions = useMemo(() => {
    const roles = new Set<string>(['dhcp', 'reserved', 'infrastructure', 'general'])
    subnets.forEach((s) => s.ipRanges.forEach((r) => roles.add(r.role)))
    rangeSchemes.forEach((scheme) => scheme.entries.forEach((entry) => roles.add(entry.role)))
    return Array.from(roles)
  }, [subnets, rangeSchemes])

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

      if (!editingSubnetId && subnetTemplatesEnabled && saveAsTemplate) {
        const tRes = await fetch('/api/subnet-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName.trim() || `${subnetForm.prefix}/${subnetForm.mask}`,
            prefix: subnetForm.prefix,
            mask: parseInt(subnetForm.mask, 10),
            gateway: subnetForm.gateway || null,
            role: subnetForm.role || null,
            description: subnetForm.description || null,
          }),
        })
        if (!tRes.ok) {
          alert('Subnet created, but saving template failed (possibly duplicate template name).')
        }
      }

      setSubnetModalOpen(false)
      setSubnetForm(emptySubnetForm)
      setEditingSubnetId(null)
      setSaveAsTemplate(false)
      setTemplateName('')
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
    setSelectedSubnetTemplate('')
    setSaveAsTemplate(false)
    setTemplateName('')
    setSubnetModalOpen(true)
  }

  const applySubnetTemplate = (templateId: string) => {
    setSelectedSubnetTemplate(templateId)
    const template = subnetTemplateOptions.find((t) => t.id === templateId)
    if (!template) return

    setSubnetForm((prev) => ({
      ...prev,
      prefix: template.prefix,
      mask: template.mask,
      gateway: smartGatewayEnabled ? suggestGatewayFromPrefix(template.prefix, parseInt(template.mask, 10)) || template.gateway : template.gateway,
      role: template.role,
      description: template.description,
    }))

    if (template.source === 'custom') {
      setTemplateName(template.name)
    }
  }

  const handleSaveRangeScheme = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subnet || subnet.ipRanges.length === 0) {
      alert('Add at least one range to this subnet before saving a scheme.')
      return
    }
    const entries = subnet.ipRanges.map((range) => ({
      startOctet: parseInt(range.startAddr.split('.').pop() || '0', 10),
      endOctet: parseInt(range.endAddr.split('.').pop() || '0', 10),
      role: range.role,
      description: range.description || null,
    }))
    const res = await fetch('/api/range-schemes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newSchemeName.trim(),
        description: newSchemeDescription.trim() || null,
        entries,
      }),
    })
    if (res.ok) {
      setSaveSchemeModalOpen(false)
      setNewSchemeName('')
      setNewSchemeDescription('')
      fetchData()
    } else {
      const data = await res.json().catch(() => null)
      alert(data?.error || 'Failed to save range scheme')
    }
  }

  const handleApplyRangeScheme = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subnet || !selectedSchemeId) return
    const res = await fetch('/api/range-schemes/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subnetId: subnet.id,
        schemeId: selectedSchemeId,
        replaceExisting: replaceExistingRanges,
      }),
    })
    if (res.ok) {
      setApplySchemeModalOpen(false)
      fetchData()
    } else {
      const data = await res.json().catch(() => null)
      alert(data?.error || 'Failed to apply range scheme')
    }
  }

  const updateSubnetFormWithSmartGateway = (updates: Partial<typeof emptySubnetForm>) => {
    setSubnetForm((prev) => {
      const next = { ...prev, ...updates }
      if (!editingSubnetId && smartGatewayEnabled && updates.gateway === undefined && !prev.gateway.trim()) {
        const suggested = suggestGatewayFromPrefix(next.prefix, parseInt(next.mask, 10))
        if (suggested) next.gateway = suggested
      }
      return next
    })
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

  if (loading) return <div className="flex items-center justify-center h-[200px] text-(--text-muted) text-[13px]">Loading IP Planner...</div>

  const getCellColor = (status: string) => {
    const root = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    switch (status) {
      case 'network': return { bg: isDark ? '#000000' : '#1e293b', color: '#fff' }
      case 'broadcast': return { bg: isDark ? '#000000' : '#1e293b', color: '#fff' }
      case 'gateway': return { bg: root?.getPropertyValue('--green').trim() || '#10b981', color: '#fff' }
      case 'assigned': return { bg: root?.getPropertyValue('--blue').trim() || '#3366ff', color: '#fff' }
      case 'dhcp': return { bg: isDark ? 'rgba(251, 191, 36, 0.15)' : '#fef3c7', color: isDark ? '#fbbf24' : '#92400e' }
      case 'reserved': return { bg: isDark ? 'rgba(167, 139, 250, 0.15)' : '#ede9fe', color: isDark ? '#a78bfa' : '#5b21b6' }
      case 'infrastructure': return { bg: isDark ? 'rgba(34, 211, 238, 0.15)' : '#cffafe', color: isDark ? '#22d3ee' : '#155e75' }
      default: return { bg: root?.getPropertyValue('--muted-bg').trim() || '#f1f3f5', color: root?.getPropertyValue('--text-faint').trim() || '#adb5bd' }
    }
  }

  // No subnets - empty state
  if (subnets.length === 0) {
    return (
      <div className="p-0 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-(--surface) border border-border rounded-lg">
          <Globe size={40} className="text-[#cbd5e1]" />
          <h3 className="text-base font-semibold mt-4 mb-2">No subnets configured</h3>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-[360px]">Create your first subnet to start planning IP addresses.</p>
          <Button onClick={openCreateSubnet}><Plus size={14} /> Create Subnet</Button>
        </div>
        {subnetModalOpen && renderSubnetModal()}
      </div>
    )
  }

  function renderSubnetModal() {
    return (
      <Dialog open={subnetModalOpen} onOpenChange={(open) => { if (!open) { setSubnetModalOpen(false); setEditingSubnetId(null) } }}>
        <DialogContent className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editingSubnetId ? 'Edit Subnet' : 'Create Subnet'}</DialogTitle>
            {!editingSubnetId && subnetTemplatesEnabled && (
              <DialogDescription>
                Start from a template to speed up subnet planning. You can adjust any field before saving.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleSaveSubnet} className="space-y-4 mt-2">
            {!editingSubnetId && subnetTemplatesEnabled && (
              <div className="space-y-1.5">
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Template</Label>
                <select
                  className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
                  value={selectedSubnetTemplate}
                  onChange={(e) => applySubnetTemplate(e.target.value)}
                >
                  <option value="">Start from blank subnet</option>
                  {subnetTemplateOptions.map((template) => (
                    <option key={template.id} value={template.id}>{template.name} — {template.prefix}/{template.mask}{template.source === 'custom' ? ' (Custom)' : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-[2fr_1fr] gap-5">
              <div className="space-y-1.5">
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Network Prefix</Label>
                <Input required value={subnetForm.prefix} onChange={e => updateSubnetFormWithSmartGateway({ prefix: e.target.value })} placeholder="e.g. 10.0.10.0" className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Mask</Label>
                <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={subnetForm.mask} onChange={e => updateSubnetFormWithSmartGateway({ mask: e.target.value })}>
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
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Gateway</Label>
                <Input value={subnetForm.gateway} onChange={e => setSubnetForm({ ...subnetForm, gateway: e.target.value })} placeholder="e.g. 10.0.10.1" className="h-9 text-[13px]" />
                {!editingSubnetId && smartGatewayEnabled && !subnetForm.gateway.trim() && (
                  <p className="text-[11px] text-(--text-muted)">Gateway will auto-suggest as first usable host when possible.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">VLAN</Label>
                <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={subnetForm.vlanId} onChange={e => setSubnetForm({ ...subnetForm, vlanId: e.target.value })}>
                  <option value="">None</option>
                  {vlans.map(v => <option key={v.id} value={v.id}>VLAN {v.vid} — {v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Role</Label>
                <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={subnetForm.role} onChange={e => setSubnetForm({ ...subnetForm, role: e.target.value })}>
                  <option value="">None</option>
                  <option value="production">Production</option>
                  <option value="management">Management</option>
                  <option value="iot">IoT</option>
                  <option value="guest">Guest</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Description</Label>
                <Input value={subnetForm.description} onChange={e => setSubnetForm({ ...subnetForm, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px]" />
              </div>
            </div>
            {!editingSubnetId && subnetTemplatesEnabled && (
              <div className="rounded-md border border-border bg-(--surface-alt) px-3 py-2.5">
                <label className="flex items-center gap-2 text-[12px] font-medium text-(--text)">
                  <input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
                  Save this subnet as a reusable template
                </label>
                {saveAsTemplate && (
                  <div className="mt-2">
                    <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Template Name</Label>
                    <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Core Infrastructure /24" className="h-9 text-[13px]" />
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setSubnetModalOpen(false); setEditingSubnetId(null) }}>Cancel</Button>
              <Button type="submit">{editingSubnetId ? 'Save Changes' : 'Create Subnet'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="p-0 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-6 mb-4 bg-(--surface) border border-border rounded-lg py-3.5 px-5">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className="flex flex-col gap-1 min-w-[280px]">
            <label className="block text-xs font-semibold text-(--text-muted)">Subnet</label>
            <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={selectedSubnet || ''} onChange={e => { setSelectedSubnet(e.target.value); setGridPage(0) }}>
              {subnets.map(s => (
                <option key={s.id} value={s.id}>{s.prefix}/{s.mask} — {s.description || 'Unnamed'} {s.vlan ? `(VLAN ${s.vlan.vid})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 max-w-[300px]">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] font-semibold text-(--text-muted) uppercase">Utilization</span>
              <span className="text-[13px] font-bold" style={{ color: utilization.pct > 80 ? '#ef4444' : utilization.pct > 50 ? '#f59e0b' : '#10b981' }}>{utilization.pct}%</span>
            </div>
            <div className="h-2 bg-(--muted-bg) rounded overflow-hidden mb-1">
              <div className="h-full rounded transition-all duration-600" style={{ width: `${utilization.pct}%`, background: utilization.pct > 80 ? '#ef4444' : utilization.pct > 50 ? '#f59e0b' : '#10b981' }} />
            </div>
            <span className="text-[11px] text-(--text-muted)">{utilization.used} / {utilization.total} addresses used</span>
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
          {subnet && rangeSchemesEnabled && (
            <Button variant="outline" onClick={() => {
              if (!selectedSchemeId && rangeSchemes.length > 0) setSelectedSchemeId(rangeSchemes[0].id)
              setApplySchemeModalOpen(true)
            }}>
              Apply Scheme
            </Button>
          )}
          {subnet && rangeSchemesEnabled && (
            <Button variant="outline" onClick={() => {
              setNewSchemeName(`${subnet.prefix}/${subnet.mask} plan`)
              setNewSchemeDescription(subnet.description || '')
              setSaveSchemeModalOpen(true)
            }}>
              Save Scheme
            </Button>
          )}
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
        <div className="flex flex-wrap gap-2 mb-4">
          {subnet.ipRanges.map((r, i) => {
            const rc = rangeColors[r.role] || rangeColors.general
            return (
              <div key={i} className="flex items-center gap-2 py-1.5 px-3 rounded-md border text-[11px] font-medium" style={{ background: rc.bg, borderColor: rc.border }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: rc.border }} />
                <span>{rc.label}: .{r.startAddr.split('.').pop()} — .{r.endAddr.split('.').pop()}</span>
                {r.description && <span className="text-(--text-muted) font-normal">{r.description}</span>}
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
                      <button key={pageIdx} className={`px-2 py-1 text-[11px] rounded min-w-7 ${pageIdx === gridPage ? 'bg-[#3366ff] text-white font-bold' : 'bg-transparent hover:bg-accent'}`} onClick={() => setGridPage(pageIdx)}>{pageIdx + 1}</button>
                    )
                  })}
                  {totalPages > 10 && <span className="text-[11px] text-(--text-light) p-1">of {totalPages}</span>}
                </div>
                <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled={gridPage >= totalPages - 1} onClick={() => setGridPage(p => p + 1)}>Next <ChevronRight size={14} /></Button>
              </div>
            </div>
          )}

          <div className="bg-(--surface) border border-border rounded-lg p-5 mb-6">
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
                  {cell.isGateway && <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-(--green-bg) text-(--green)">Gateway</span>}
                  {cell.device && <span><Server size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{cell.device.name}</span>}
                  {cell.ip && !cell.device && <span>{cell.ip.dnsName || cell.ip.assignedTo || 'Unnamed'}</span>}
                  {cell.ip?.description && <span className="ipam-tooltip-desc">{cell.ip.description}</span>}
                  {!cell.ip && !cell.device && cell.range && <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${cell.range.role === 'dhcp' ? 'bg-(--orange-bg) text-(--orange)' : cell.range.role === 'reserved' ? 'bg-(--purple-bg) text-(--purple)' : 'bg-(--blue-bg) text-(--blue)'}`}>{cell.range.role} range</span>}
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
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse table-fixed">
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
                          <Server size={11} color="#3366ff" />
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
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#3366ff]" onClick={() => { setEditingIpId(cell.ip!.id); const dev = cell.device || devices.find(d => d.ipAddress === cell.ip!.address); setIpForm({ address: cell.ip!.address, dnsName: cell.ip!.dnsName || '', description: cell.ip!.description || '', status: cell.ip!.status, deviceId: dev?.id || '' }); setIpModalOpen(true) }} title="Edit"><Edit2 size={12} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-(--red)" onClick={() => handleDeleteIp(cell.ip!.id)} title="Delete"><Trash2 size={12} /></Button>
                        </div>
                      )}
                      {!cell.ip && cell.device && (
                        <div className="flex gap-0.5 justify-end">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#3366ff]" onClick={() => handlePromoteDeviceIp(cell.device!)} title="Manage in IPAM"><Edit2 size={12} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-(--red)" onClick={() => handleUnlinkDevice(cell.device!.id)} title="Unlink IP"><Trash2 size={12} /></Button>
                        </div>
                      )}
                      {!cell.ip && !cell.device && cell.status !== 'network' && cell.status !== 'broadcast' && cell.status !== 'gateway' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-[#3366ff]" onClick={() => openAssignFromGrid(cell.fullIp)}><Plus size={12} /></Button>
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
          <div className="flex flex-col gap-5">
            {/* Stats Cards — consistent with all views */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="text-xs text-(--text-muted) font-medium">Used Addresses</div>
                <div className="text-2xl font-bold leading-none text-[#3366ff]">{utilization.used}</div>
                <div className="text-[10px] text-(--text-light)">{utilization.pct}% of {utilization.total}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="text-xs text-(--text-muted) font-medium">Available</div>
                <div className="text-2xl font-bold leading-none text-[#10b981]">{statusCounts['available'] || 0}</div>
                <div className="text-[10px] text-(--text-light)">Ready to assign</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="text-xs text-(--text-muted) font-medium">Devices</div>
                <div className="text-2xl font-bold leading-none text-[#7c3aed]">{deviceCount}</div>
                <div className="text-[10px] text-(--text-light)">Linked to IPs</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="text-xs text-(--text-muted) font-medium">Manual IPs</div>
                <div className="text-2xl font-bold leading-none text-[#f59e0b]">{ipamCount}</div>
                <div className="text-[10px] text-(--text-light)">No device linked</div>
              </div>
            </div>

            {/* Subnet Info */}
            <div className="bg-(--surface) border border-border rounded-[10px] p-5">
              <h3 className="text-[13px] font-semibold text-(--text) mb-4">Subnet Details</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between py-1.5 border-b border-(--muted-bg-alt) last:border-b-0 text-xs">
                  <span className="text-(--text-light) font-medium">Network</span>
                  <code>{subnet.prefix}/{subnet.mask}</code>
                </div>
                {subnet.gateway && (
                  <div className="flex items-center justify-between py-1.5 border-b border-(--muted-bg-alt) last:border-b-0 text-xs">
                    <span className="text-(--text-light) font-medium">Gateway</span>
                    <code>{subnet.gateway}</code>
                  </div>
                )}
                {subnet.vlan && (
                  <div className="flex items-center justify-between py-1.5 border-b border-(--muted-bg-alt) last:border-b-0 text-xs">
                    <span className="text-(--text-light) font-medium">VLAN</span>
                    <span>VLAN {subnet.vlan.vid} — {subnet.vlan.name}</span>
                  </div>
                )}
                {subnet.role && (
                  <div className="flex items-center justify-between py-1.5 border-b border-(--muted-bg-alt) last:border-b-0 text-xs">
                    <span className="text-(--text-light) font-medium">Role</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold capitalize">{subnet.role}</span>
                  </div>
                )}
                {subnet.description && (
                  <div className="flex items-center justify-between py-1.5 border-b border-(--muted-bg-alt) last:border-b-0 text-xs">
                    <span className="text-(--text-light) font-medium">Description</span>
                    <span>{subnet.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Address Breakdown Bar */}
            <div className="bg-(--surface) border border-border rounded-[10px] p-5">
              <h3 className="text-[13px] font-semibold text-(--text) mb-4">Address Breakdown</h3>
              <div className="flex h-5 rounded-md overflow-hidden gap-px mb-3">
                {statusCounts['gateway'] && <div className="min-w-0.5 transition-all duration-300" style={{ flex: statusCounts['gateway'], background: '#10b981' }} title={`Gateway: ${statusCounts['gateway']}`} />}
                {statusCounts['assigned'] && <div className="min-w-0.5 transition-all duration-300" style={{ flex: statusCounts['assigned'], background: '#3366ff' }} title={`Assigned: ${statusCounts['assigned']}`} />}
                {statusCounts['dhcp'] && <div className="min-w-0.5 transition-all duration-300" style={{ flex: statusCounts['dhcp'], background: '#f59e0b' }} title={`DHCP: ${statusCounts['dhcp']}`} />}
                {statusCounts['reserved'] && <div className="min-w-0.5 transition-all duration-300" style={{ flex: statusCounts['reserved'], background: '#8b5cf6' }} title={`Reserved: ${statusCounts['reserved']}`} />}
                {statusCounts['infrastructure'] && <div className="min-w-0.5 transition-all duration-300" style={{ flex: statusCounts['infrastructure'], background: '#06b6d4' }} title={`Infrastructure: ${statusCounts['infrastructure']}`} />}
                {statusCounts['available'] && <div className="min-w-0.5 transition-all duration-300" style={{ flex: statusCounts['available'], background: '#e2e8f0' }} title={`Available: ${statusCounts['available']}`} />}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-(--text-slate)">
                {statusCounts['gateway'] && <span><span className="inline-block w-2 h-2 rounded-sm mr-1 align-middle" style={{ background: '#10b981' }} /> Gateway ({statusCounts['gateway']})</span>}
                {statusCounts['assigned'] && <span><span className="inline-block w-2 h-2 rounded-sm mr-1 align-middle" style={{ background: '#3366ff' }} /> Assigned ({statusCounts['assigned']})</span>}
                {statusCounts['dhcp'] && <span><span className="inline-block w-2 h-2 rounded-sm mr-1 align-middle" style={{ background: '#f59e0b' }} /> DHCP ({statusCounts['dhcp']})</span>}
                {statusCounts['reserved'] && <span><span className="inline-block w-2 h-2 rounded-sm mr-1 align-middle" style={{ background: '#8b5cf6' }} /> Reserved ({statusCounts['reserved']})</span>}
                {statusCounts['infrastructure'] && <span><span className="inline-block w-2 h-2 rounded-sm mr-1 align-middle" style={{ background: '#06b6d4' }} /> Infrastructure ({statusCounts['infrastructure']})</span>}
                <span><span className="inline-block w-2 h-2 rounded-sm mr-1 align-middle" style={{ background: '#e2e8f0' }} /> Available ({statusCounts['available'] || 0})</span>
              </div>
            </div>

            {/* Range Utilization */}
            {rangeSummary.length > 0 && (
              <div className="bg-(--surface) border border-border rounded-[10px] p-5">
                <h3 className="text-[13px] font-semibold text-(--text) mb-4">Range Utilization</h3>
                {rangeSummary.map((r, i) => {
                  const rc = rangeColors[r.role] || rangeColors.general
                  return (
                    <div key={i} className="mb-3 last:mb-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-xs">{rc.label}: .{r.startAddr.split('.').pop()} — .{r.endAddr.split('.').pop()}</span>
                        <span className="text-[11px] text-(--text-light)">{r.used}/{r.total} used ({r.pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-(--muted-bg) rounded overflow-hidden">
                        <div className="h-full rounded transition-all duration-600" style={{ width: `${r.pct}%`, background: rc.border }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Devices on this subnet */}
            {deviceCount > 0 && (
              <div className="bg-(--surface) border border-border rounded-[10px] p-5">
                <h3 className="text-[13px] font-semibold text-(--text) mb-4">Devices on this Subnet</h3>
                <div className="flex flex-col gap-2">
                  {cellData.filter(c => c.device).map(c => (
                    <div key={c.octet} className="flex items-center gap-2 py-2 px-3 bg-(--surface-alt) border border-(--muted-bg-alt) rounded-lg text-xs">
                      <Server size={13} color="#3366ff" />
                      <span className="font-medium">{c.device!.name}</span>
                      <code className="text-[10px] text-(--text-light) ml-auto">{c.fullIp}</code>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${c.device!.status === 'active' ? 'bg-(--green-bg) text-(--green)' : 'bg-(--orange-bg) text-(--orange)'}`}>{c.device!.status}</span>
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
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-sm font-semibold">Assigned Addresses</h2>
              <div className="flex gap-2 items-center">
                <span className="text-[11px] text-(--text-muted) bg-(--muted-bg) px-2 py-0.5 rounded">{totalAssigned} addresses</span>
                <Button size="sm" className="h-7 px-2.5 text-[11px]" onClick={() => { setEditingIpId(null); setIpForm({ address: `${base}.`, dnsName: '', description: '', status: 'active', deviceId: '' }); setIpModalOpen(true) }}><Plus size={12} /> Assign IP</Button>
              </div>
            </div>
            {totalAssigned === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-[13px]">No IP addresses assigned yet. Click a cell in the grid or use the button above.</div>
            ) : (
              <table className="w-full border-collapse table-fixed">
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
                                <Server size={11} color="#3366ff" />
                                {linkedDevice.name}
                              </span>
                            ) : (
                              ip.dnsName || ip.assignedTo || '—'
                            )}
                          </td>
                          <td><span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-(--green-bg) text-(--green)">{ip.status}</span></td>
                          <td className="text-muted-foreground">{ip.description || '—'}</td>
                          <td className="text-right pr-2">
                            <div className="flex gap-0.5 justify-end">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-[#3366ff]" onClick={() => { setEditingIpId(ip.id); const dev = linkedDevice || devices.find(d => d.ipAddress === ip.address); setIpForm({ address: ip.address, dnsName: ip.dnsName || '', description: ip.description || '', status: ip.status, deviceId: dev?.id || '' }); setIpModalOpen(true) }} title="Edit"><Edit2 size={12} /></Button>
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
                          <Server size={11} color="#3366ff" />
                          {d.name}
                        </span>
                      </td>
                      <td><span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${d.status === 'active' ? 'bg-(--green-bg) text-(--green)' : 'bg-(--orange-bg) text-(--orange)'}`}>{d.status}</span></td>
                      <td className="text-muted-foreground">{d.category} — {d.platform || 'No platform'}</td>
                      <td className="text-right pr-2">
                        <div className="flex gap-0.5 justify-end">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#3366ff]" onClick={() => handlePromoteDeviceIp(d)} title="Manage in IPAM"><Edit2 size={12} /></Button>
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
          <form onSubmit={handleSaveRange} className="space-y-4 mt-2">
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
                <Input list="ipam-range-role-options" value={rangeForm.role} onChange={e => setRangeForm({ ...rangeForm, role: e.target.value })} placeholder="e.g. dhcp, hypervisors, core-services" className="h-9 text-[13px]" />
                <datalist id="ipam-range-role-options">
                  {rangeRoleSuggestions.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
                <Input value={rangeForm.description} onChange={e => setRangeForm({ ...rangeForm, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px]" />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setRangeModalOpen(false); setEditingRangeId(null) }}>Cancel</Button>
              <Button type="submit">{editingRangeId ? 'Save Changes' : 'Add Range'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={saveSchemeModalOpen && !!subnet} onOpenChange={setSaveSchemeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Range Scheme</DialogTitle>
            <DialogDescription>
              Save current ranges from {subnet?.prefix}/{subnet?.mask} as a reusable scheme.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRangeScheme} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Scheme Name</Label>
              <Input required value={newSchemeName} onChange={(e) => setNewSchemeName(e.target.value)} placeholder="e.g. Home Core Allocation" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
              <Input value={newSchemeDescription} onChange={(e) => setNewSchemeDescription(e.target.value)} placeholder="Optional" className="h-9 text-[13px]" />
            </div>
            <div className="rounded-md border border-border bg-(--surface-alt) px-3 py-2.5 text-xs text-(--text-muted)">
              This will save {subnet?.ipRanges.length || 0} range entries from the selected subnet.
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setSaveSchemeModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Scheme</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={applySchemeModalOpen && !!subnet} onOpenChange={setApplySchemeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Range Scheme</DialogTitle>
            <DialogDescription>
              Apply a saved multi-range allocation scheme to {subnet?.prefix}/{subnet?.mask}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApplyRangeScheme} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Scheme</Label>
              <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={selectedSchemeId} onChange={(e) => setSelectedSchemeId(e.target.value)}>
                <option value="">Select a scheme</option>
                {rangeSchemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>{scheme.name} ({scheme.entries.length} entries)</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-[12px] font-medium text-(--text)">
              <input type="checkbox" checked={replaceExistingRanges} onChange={(e) => setReplaceExistingRanges(e.target.checked)} />
              Replace existing ranges on this subnet
            </label>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setApplySchemeModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!selectedSchemeId}>Apply Scheme</Button>
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
          <form onSubmit={handleAssignIp} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Link to Device (Optional)</Label>
              <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={ipForm.deviceId} onChange={e => {
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
              <Input value={ipForm.description} onChange={e => setIpForm({ ...ipForm, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px]" />
            </div>
            <DialogFooter className="mt-6 flex items-center">
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
            </DialogFooter>
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
