'use client'

import { useState, useEffect, useMemo } from 'react'
import { Wifi, Plus, Edit2, Trash2, Shield, Eye, EyeOff, Radio, Signal, Lock, Unlock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface WifiVlan { id: string; vid: number; name: string; role?: string | null }
interface WifiSubnet { id: string; prefix: string; mask: number; description?: string | null; gateway?: string | null }

interface WifiData {
  id: string
  ssid: string
  security: string
  passphrase?: string | null
  band: string
  hidden: boolean
  enabled: boolean
  vlanId?: string | null
  vlan?: WifiVlan | null
  subnetId?: string | null
  subnet?: WifiSubnet | null
  guestNetwork: boolean
  clientIsolation: boolean
  bandSteering: boolean
  pmf: string
  txPower: string
  minRate?: number | null
  description?: string | null
}

const securityLabels: Record<string, string> = {
  'open': 'Open',
  'wpa2-personal': 'WPA2 Personal',
  'wpa3-personal': 'WPA3 Personal',
  'wpa2-enterprise': 'WPA2 Enterprise',
  'wpa3-enterprise': 'WPA3 Enterprise',
}

const bandLabels: Record<string, string> = {
  '2.4ghz': '2.4 GHz',
  '5ghz': '5 GHz',
  '6ghz': '6 GHz',
  'both': '2.4 + 5 GHz',
}

const securityColors: Record<string, string> = {
  'open': '#ef4444',
  'wpa2-personal': '#0055ff',
  'wpa3-personal': '#10b981',
  'wpa2-enterprise': '#7c3aed',
  'wpa3-enterprise': '#059669',
}

const emptyForm = {
  ssid: '', security: 'wpa2-personal', passphrase: '', band: 'both',
  hidden: false, enabled: true, vlanId: '', subnetId: '',
  guestNetwork: false, clientIsolation: false, bandSteering: true,
  pmf: 'optional', txPower: 'auto', minRate: '', description: '',
}

interface WiFiViewProps {
  searchTerm?: string
  selectedSecurityFilter?: string | null
  highlightId?: string | null
}

const WiFiView = ({ searchTerm = '', selectedSecurityFilter = null, highlightId = null }: WiFiViewProps) => {
  const [networks, setNetworks] = useState<WifiData[]>([])
  const [vlans, setVlans] = useState<WifiVlan[]>([])
  const [subnets, setSubnets] = useState<WifiSubnet[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassphrase, setShowPassphrase] = useState(false)

  const fetchData = () => {
    Promise.all([
      fetch('/api/wifi').then(r => r.json()),
      fetch('/api/vlans').then(r => r.json()),
      fetch('/api/subnets').then(r => r.json()),
    ]).then(([wifiData, vlanData, subnetData]) => {
      setNetworks(Array.isArray(wifiData) ? wifiData : [])
      setVlans(Array.isArray(vlanData) ? vlanData : [])
      setSubnets(Array.isArray(subnetData) ? subnetData : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowPassphrase(false)
    setModalOpen(true)
  }

  const openEdit = (n: WifiData) => {
    setEditingId(n.id)
    setForm({
      ssid: n.ssid, security: n.security, passphrase: n.passphrase || '', band: n.band,
      hidden: n.hidden, enabled: n.enabled, vlanId: n.vlanId || '', subnetId: n.subnetId || '',
      guestNetwork: n.guestNetwork, clientIsolation: n.clientIsolation, bandSteering: n.bandSteering,
      pmf: n.pmf, txPower: n.txPower, minRate: n.minRate ? String(n.minRate) : '', description: n.description || '',
    })
    setShowPassphrase(false)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ssid: form.ssid, security: form.security,
      passphrase: form.security === 'open' ? null : (form.passphrase || null),
      band: form.band, hidden: form.hidden, enabled: form.enabled,
      vlanId: form.vlanId || null, subnetId: form.subnetId || null,
      guestNetwork: form.guestNetwork, clientIsolation: form.clientIsolation,
      bandSteering: form.bandSteering, pmf: form.pmf, txPower: form.txPower,
      minRate: form.minRate ? parseInt(form.minRate) : null, description: form.description || null,
    }
    const method = editingId ? 'PATCH' : 'POST'
    const url = editingId ? `/api/wifi/${editingId}` : '/api/wifi'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { setModalOpen(false); setEditingId(null); fetchData() } else { alert('Failed to save WiFi network') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/wifi/${deleteTarget}`, { method: 'DELETE' })
    if (res.ok) { setDeleteModalOpen(false); setDeleteTarget(null); fetchData() }
  }

  const handleToggleEnabled = async (n: WifiData) => {
    await fetch(`/api/wifi/${n.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !n.enabled }) })
    fetchData()
  }

  const filtered = useMemo(() => {
    return networks.filter(n => {
      if (selectedSecurityFilter) {
        if (selectedSecurityFilter === 'wpa2' && !n.security.startsWith('wpa2')) return false
        if (selectedSecurityFilter === 'wpa3' && !n.security.startsWith('wpa3')) return false
        if (selectedSecurityFilter === 'open' && n.security !== 'open') return false
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return n.ssid.toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q) || n.security.toLowerCase().includes(q) || (n.vlan?.name || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [networks, searchTerm, selectedSecurityFilter])

  const enabledCount = networks.filter(n => n.enabled).length
  const guestCount = networks.filter(n => n.guestNetwork).length

  if (loading) return <div className="flex items-center justify-center h-[200px] text-muted-foreground text-[13px]">Loading WiFi networks...</div>

  return (
    <div className="animate-in fade-in duration-300">
      {networks.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={openCreate}><Plus size={14} /> Create WiFi Network</Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Networks', value: networks.length, color: '#0055ff' },
          { label: 'Enabled', value: enabledCount, color: '#10b981' },
          { label: 'Guest Networks', value: guestCount, color: '#f59e0b' },
          { label: 'Disabled', value: networks.length - enabledCount, color: '#94a3b8' },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5 text-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {networks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-lg">
          <Wifi size={40} className="text-[#cbd5e1]" />
          <h3 className="text-base font-semibold mt-4 mb-2">No WiFi networks configured</h3>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-[360px]">Create your first WiFi network to start managing wireless access.</p>
          <Button onClick={openCreate}><Plus size={14} /> Create WiFi Network</Button>
        </div>
      ) : (
        <>
          {/* WiFi Network Cards */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4 mb-6">
            {filtered.map(n => {
              const secColor = securityColors[n.security] || '#64748b'
              return (
                <div key={n.id} className="bg-card border border-border rounded-[10px] p-5 relative" style={{ opacity: n.enabled ? 1 : 0.6 }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: `${secColor}14`, color: secColor }}>
                        <Wifi size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{n.ssid}</div>
                        <div className="flex gap-1.5 items-center mt-0.5">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-semibold" style={{ background: `${secColor}14`, color: secColor }}>
                            {n.security === 'open' ? <Unlock size={8} /> : <Lock size={8} />}
                            {securityLabels[n.security] || n.security}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{bandLabels[n.band] || n.band}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5 items-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: n.enabled ? '#10b981' : '#94a3b8' }} onClick={() => handleToggleEnabled(n)} title={n.enabled ? 'Disable' : 'Enable'}><Radio size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(n)} title="Edit"><Edit2 size={12} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:text-[#ef4444]" onClick={() => { setDeleteTarget(n.id); setDeleteModalOpen(true) }} title="Delete"><Trash2 size={12} /></Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className={`badge badge-${n.enabled ? 'green' : 'orange'} text-[10px]`}>{n.enabled ? 'Enabled' : 'Disabled'}</span>
                    {n.guestNetwork && <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] bg-[#fef3c7] text-[#92400e]"><Users size={8} /> Guest</span>}
                    {n.hidden && <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] bg-(--muted-bg) text-(--text-slate)"><EyeOff size={8} /> Hidden</span>}
                    {n.clientIsolation && <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] bg-[#ede9fe] text-[#5b21b6]"><Shield size={8} /> Isolated</span>}
                  </div>

                  <div className="text-xs text-muted-foreground flex flex-col gap-1">
                    {n.vlan && <div className="flex justify-between"><span>VLAN</span><span className="font-medium text-foreground">VLAN {n.vlan.vid} — {n.vlan.name}</span></div>}
                    {n.subnet && <div className="flex justify-between"><span>Subnet</span><code className="text-[11px] bg-(--muted-bg) px-1.5 py-px rounded">{n.subnet.prefix}/{n.subnet.mask}</code></div>}
                    {n.description && <div className="mt-1 italic text-[11px]">{n.description}</div>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex gap-2 flex-wrap">
                    <span className="text-[10px] text-(--text-light) bg-(--surface-alt) px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Signal size={8} /> TX: {n.txPower}</span>
                    <span className="text-[10px] text-(--text-light) bg-(--surface-alt) px-1.5 py-0.5 rounded">PMF: {n.pmf}</span>
                    {n.bandSteering && <span className="text-[10px] text-(--text-light) bg-(--surface-alt) px-1.5 py-0.5 rounded">Band Steering</span>}
                    {n.minRate && <span className="text-[10px] text-(--text-light) bg-(--surface-alt) px-1.5 py-0.5 rounded">Min: {n.minRate} Mbps</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Table view */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold">All WiFi Networks</h2>
              <span className="text-[11px] text-muted-foreground bg-(--muted-bg) px-2 py-0.5 rounded">{filtered.length} networks</span>
            </div>
            <table className="unifi-table">
              <thead>
                <tr>
                  <th className="w-[180px]">SSID</th>
                  <th className="w-[140px]">Security</th>
                  <th className="w-[100px]">Band</th>
                  <th className="w-[140px]">VLAN</th>
                  <th className="w-[140px]">Subnet</th>
                  <th className="w-20">Status</th>
                  <th>Features</th>
                  <th className="w-20 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id} data-highlight-id={n.id} className={highlightId === n.id ? 'highlight-flash' : ''} style={{ opacity: n.enabled ? 1 : 0.5 }}>
                    <td className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <Wifi size={13} style={{ color: securityColors[n.security] || '#64748b' }} />
                        {n.ssid}
                      </div>
                    </td>
                    <td><span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${securityColors[n.security] || '#64748b'}14`, color: securityColors[n.security] || '#64748b' }}>{securityLabels[n.security] || n.security}</span></td>
                    <td className="text-xs">{bandLabels[n.band] || n.band}</td>
                    <td>{n.vlan ? `VLAN ${n.vlan.vid}` : <span className="text-(--text-light)">—</span>}</td>
                    <td>{n.subnet ? <code className="text-[11px] bg-(--muted-bg) px-1.5 py-0.5 rounded">{n.subnet.prefix}/{n.subnet.mask}</code> : <span className="text-(--text-light)">—</span>}</td>
                    <td><span className={`badge badge-${n.enabled ? 'green' : 'orange'}`}>{n.enabled ? 'active' : 'disabled'}</span></td>
                    <td className="text-[11px] text-(--text-light)">{[n.guestNetwork && 'Guest', n.hidden && 'Hidden', n.clientIsolation && 'Isolated', n.bandSteering && 'Band Steering'].filter(Boolean).join(', ') || '—'}</td>
                    <td className="text-right pr-2">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(n)}><Edit2 size={12} /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:text-[#ef4444]" onClick={() => { setDeleteTarget(n.id); setDeleteModalOpen(true) }}><Trash2 size={12} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingId(null) }}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit WiFi Network' : 'Create WiFi Network'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">SSID (Network Name)</Label>
                <Input required value={form.ssid} onChange={e => setForm({ ...form, ssid: e.target.value })} placeholder="e.g. HomeNetwork" className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Security</Label>
                <select className="unifi-input" value={form.security} onChange={e => setForm({ ...form, security: e.target.value })}>
                  <option value="wpa2-personal">WPA2 Personal</option>
                  <option value="wpa3-personal">WPA3 Personal</option>
                  <option value="wpa2-enterprise">WPA2 Enterprise</option>
                  <option value="wpa3-enterprise">WPA3 Enterprise</option>
                  <option value="open">Open (No Security)</option>
                </select>
              </div>
            </div>

            {form.security !== 'open' && (
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Passphrase</Label>
                <div className="relative">
                  <Input type={showPassphrase ? 'text' : 'password'} value={form.passphrase} onChange={e => setForm({ ...form, passphrase: e.target.value })} placeholder="WiFi password" minLength={8} className="h-9 pr-10 text-[13px]" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassphrase(!showPassphrase)}>
                    {showPassphrase ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Band</Label>
                <select className="unifi-input" value={form.band} onChange={e => setForm({ ...form, band: e.target.value })}>
                  <option value="both">2.4 GHz + 5 GHz</option>
                  <option value="2.4ghz">2.4 GHz Only</option>
                  <option value="5ghz">5 GHz Only</option>
                  <option value="6ghz">6 GHz Only</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">VLAN</Label>
                <select className="unifi-input" value={form.vlanId} onChange={e => setForm({ ...form, vlanId: e.target.value })}>
                  <option value="">None (Default)</option>
                  {vlans.map(v => <option key={v.id} value={v.id}>VLAN {v.vid} — {v.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Subnet</Label>
                <select className="unifi-input" value={form.subnetId} onChange={e => setForm({ ...form, subnetId: e.target.value })}>
                  <option value="">Auto / None</option>
                  {subnets.map(s => <option key={s.id} value={s.id}>{s.prefix}/{s.mask} {s.description ? `— ${s.description}` : ''}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="mt-2 p-4 bg-(--surface-alt) rounded-lg grid grid-cols-2 gap-3">
              {[
                { key: 'enabled', label: 'Enabled' },
                { key: 'guestNetwork', label: 'Guest Network' },
                { key: 'hidden', label: 'Hidden SSID' },
                { key: 'clientIsolation', label: 'Client Isolation' },
                { key: 'bandSteering', label: 'Band Steering' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-5 mt-3">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">PMF</Label>
                <select className="unifi-input" value={form.pmf} onChange={e => setForm({ ...form, pmf: e.target.value })}>
                  <option value="disabled">Disabled</option>
                  <option value="optional">Optional</option>
                  <option value="required">Required</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">TX Power</Label>
                <select className="unifi-input" value={form.txPower} onChange={e => setForm({ ...form, txPower: e.target.value })}>
                  <option value="auto">Auto</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Min Rate (Mbps)</Label>
                <Input type="number" value={form.minRate} onChange={e => setForm({ ...form, minRate: e.target.value })} placeholder="Auto" min={1} max={54} className="h-9 text-[13px]" />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditingId(null) }}>Cancel</Button>
              <Button type="submit">{editingId ? 'Save Changes' : 'Create Network'}</Button>
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
            <DialogTitle className="text-lg font-semibold">Delete WiFi Network?</DialogTitle>
            <DialogDescription className="mt-2">This will permanently remove this wireless network configuration.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-4 sm:justify-center">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Network</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WiFiView
