'use client'

import { useState, useEffect, useMemo } from 'react'
import { Network, Plus, Edit2, Trash2 } from 'lucide-react'
import { CustomCategory } from '@/types'
import { getCategoryIcon } from '@/lib/category-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface VLANData {
  id: string
  vid: number
  name: string
  status: string
  role?: string | null
  description?: string | null
  subnets: { id: string; prefix: string; mask: number; description?: string | null; gateway?: string | null }[]
}

const defaultRoleColors: Record<string, string> = {
  management: '#3366ff',
  production: '#10b981',
  iot: '#f97316',
  guest: '#8b5cf6',
}

interface VLANViewProps {
  searchTerm?: string
  selectedRole?: string | null
  vlanRoles?: CustomCategory[]
  highlightId?: string | null
}

const emptyForm = { vid: '', name: '', status: 'active', role: '', description: '' }

const VLANView = ({ searchTerm = '', selectedRole = null, vlanRoles = [], highlightId = null }: VLANViewProps) => {
  const [vlans, setVlans] = useState<VLANData[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchVlans = () => {
    fetch('/api/vlans')
      .then(r => r.json())
      .then(setVlans)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchVlans() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (v: VLANData) => {
    setEditingId(v.id)
    setForm({ vid: String(v.vid), name: v.name, status: v.status, role: v.role || '', description: v.description || '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { vid: parseInt(form.vid), name: form.name, status: form.status, role: form.role || null, description: form.description || null }
    const method = editingId ? 'PATCH' : 'POST'
    const url = editingId ? `/api/vlans/${editingId}` : '/api/vlans'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setModalOpen(false); fetchVlans() } else { alert('Failed to save VLAN') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/vlans/${deleteTarget}`, { method: 'DELETE' })
    if (res.ok) { setDeleteModalOpen(false); setDeleteTarget(null); fetchVlans() }
  }

  const filteredVlans = useMemo(() => {
    return vlans.filter(v => {
      const matchesRole = selectedRole ? v.role === selectedRole : true
      const matchesSearch = !searchTerm || 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(v.vid).includes(searchTerm) ||
        (v.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.subnets.some(s => s.prefix.includes(searchTerm))
      return matchesRole && matchesSearch
    })
  }, [vlans, selectedRole, searchTerm])

  if (loading) return <div className="flex items-center justify-center h-[200px] text-muted-foreground text-[13px]">Loading VLANs...</div>

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-muted-foreground">{vlans.length} VLAN{vlans.length !== 1 ? 's' : ''} configured</span>
        <Button size="sm" onClick={openCreate}><Plus size={14} /> Add VLAN</Button>
      </div>

      {vlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-lg">
          <Network size={40} className="text-[#cbd5e1]" />
          <h3 className="text-base font-semibold mt-4 mb-2">No VLANs configured</h3>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-[360px]">Create your first VLAN to start segmenting your network.</p>
          <Button onClick={openCreate}><Plus size={14} /> Create VLAN</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 mb-6">
            {filteredVlans.map(v => {
              const roleEntry = vlanRoles.find(r => r.slug === v.role)
              const color = roleEntry?.color || defaultRoleColors[v.role || ''] || '#64748b'
              const Icon = roleEntry ? getCategoryIcon(roleEntry.icon) : Network
              return (
                <div key={v.id} className="bg-(--surface) border border-border rounded-lg p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${color}14`, color }}>
                      <Icon size={20} />
                    </div>
                    <div className="flex items-start justify-between flex-1">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-(--text-muted) font-semibold">VLAN {v.vid}</span>
                        <span className="text-[15px] font-semibold text-(--text)">{v.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)} title="Edit"><Edit2 size={12} /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:text-[#ef4444]" onClick={() => { setDeleteTarget(v.id); setDeleteModalOpen(true) }} title="Delete"><Trash2 size={12} /></Button>
                      </div>
                    </div>
                  </div>
                  {v.description && <p className="text-xs text-(--text-muted) mb-3 leading-relaxed">{v.description}</p>}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] text-(--text-muted) font-semibold uppercase">Role</span>
                    <span className="text-xs font-semibold capitalize" style={{ color }}>{v.role || 'Unassigned'}</span>
                  </div>
                  {v.subnets.length > 0 && (
                    <div className="bg-(--surface-alt) border border-border rounded-md p-3 mb-3">
                      <span className="text-[10px] text-(--text-muted) font-semibold uppercase block mb-2">Associated Subnets</span>
                      {v.subnets.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-1">
                          <code className="text-xs font-medium bg-(--muted-bg) px-1.5 py-0.5 rounded">{s.prefix}/{s.mask}</code>
                          {s.gateway && <span className="text-[10px] text-(--text-muted)">GW: {s.gateway}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-2">
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-(--blue-bg) text-(--blue)">{v.subnets.length} subnet{v.subnets.length !== 1 ? 's' : ''}</span>
                      {v.role && <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${color}14`, color }}>{v.role}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden mt-6">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-sm font-semibold">VLAN Overview</h2>
            </div>
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="w-20">VID</th>
                  <th className="w-[150px]">Name</th>
                  <th className="w-[120px]">Role</th>
                  <th className="w-[100px]">Status</th>
                  <th>Subnets</th>
                  <th>Description</th>
                  <th className="w-20 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVlans.map(v => {
                  const rc = vlanRoles.find(r => r.slug === v.role)?.color || defaultRoleColors[v.role || ''] || '#64748b'
                  return (
                    <tr key={v.id} data-highlight-id={v.id} className={highlightId === v.id ? 'highlight-flash' : ''}>
                      <td><code className="text-xs font-semibold" style={{ color: rc }}>{v.vid}</code></td>
                      <td className="font-medium">{v.name}</td>
                      <td><span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${rc}14`, color: rc }}>{v.role || '—'}</span></td>
                      <td><span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${v.status === 'active' ? 'bg-(--green-bg) text-(--green)' : 'bg-(--orange-bg) text-(--orange)'}`}>{v.status}</span></td>
                      <td>{v.subnets.map(s => <code key={s.id} className="text-[11px] bg-(--muted-bg) px-1.5 py-0.5 rounded mr-1">{s.prefix}/{s.mask}</code>)}</td>
                      <td className="text-muted-foreground">{v.description || '—'}</td>
                      <td className="text-right pr-2">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Edit2 size={12} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:text-[#ef4444]" onClick={() => { setDeleteTarget(v.id); setDeleteModalOpen(true) }}><Trash2 size={12} /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null) }}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit VLAN' : 'Create VLAN'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">VLAN ID (VID)</Label>
                <Input required type="number" min={1} max={4094} value={form.vid} onChange={e => setForm({ ...form, vid: e.target.value })} placeholder="e.g. 10" className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Name</Label>
                <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Management" className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Role</Label>
                <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="">None</option>
                  {vlanRoles.length > 0 ? vlanRoles.map(r => (
                    <option key={r.id} value={r.slug}>{r.name}</option>
                  )) : (
                    <>
                      <option value="management">Management</option>
                      <option value="production">Production</option>
                      <option value="iot">IoT</option>
                      <option value="guest">Guest</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Status</Label>
                <select className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="reserved">Reserved</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className="h-9 text-[13px]" />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? 'Save Changes' : 'Create VLAN'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-[400px] text-center">
          <DialogHeader className="flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--red-bg-subtle) text-(--red)">
              <Trash2 size={24} />
            </div>
            <DialogTitle className="text-lg font-semibold">Delete VLAN?</DialogTitle>
            <DialogDescription className="mt-2">This will remove the VLAN. Associated subnets will be unlinked.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-4 sm:justify-center">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete VLAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VLANView
