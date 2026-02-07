'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Server, Globe, Network, Wifi, Box, ArrowRight } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'device' | 'subnet' | 'vlan' | 'wifi' | 'service' | 'ip'
  title: string
  subtitle: string
  view: string
  icon: React.ElementType
  color: string
}

interface CommandPaletteProps {
  onNavigate: (view: string, itemId?: string) => void
}

const CommandPalette = ({ onNavigate }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [allData, setAllData] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch all searchable data when palette opens
  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/devices').then(r => r.json()),
      fetch('/api/subnets').then(r => r.json()),
      fetch('/api/vlans').then(r => r.json()),
      fetch('/api/wifi').then(r => r.json()),
      fetch('/api/services').then(r => r.json()),
    ]).then(([devices, subnets, vlans, wifi, services]) => {
      const items: SearchResult[] = []
      if (Array.isArray(devices)) {
        devices.forEach((d: { id: string; name: string; ipAddress: string; category: string; status: string }) => {
          items.push({ id: d.id, type: 'device', title: d.name, subtitle: `${d.ipAddress || 'No IP'} \u00b7 ${d.category} \u00b7 ${d.status}`, view: 'devices', icon: Server, color: '#0055ff' })
        })
      }
      if (Array.isArray(subnets)) {
        subnets.forEach((s: { id: string; prefix: string; mask: number; description?: string; gateway?: string }) => {
          items.push({ id: s.id, type: 'subnet', title: `${s.prefix}/${s.mask}`, subtitle: s.description || s.gateway || 'Subnet', view: 'ipam', icon: Globe, color: '#10b981' })
        })
      }
      if (Array.isArray(vlans)) {
        vlans.forEach((v: { id: string; vid: number; name: string; role?: string }) => {
          items.push({ id: v.id, type: 'vlan', title: `VLAN ${v.vid} \u2014 ${v.name}`, subtitle: v.role || 'VLAN', view: 'vlans', icon: Network, color: '#7c3aed' })
        })
      }
      if (Array.isArray(wifi)) {
        wifi.forEach((w: { id: string; ssid: string; security: string; band: string }) => {
          items.push({ id: w.id, type: 'wifi', title: w.ssid, subtitle: `${w.security} \u00b7 ${w.band}`, view: 'wifi', icon: Wifi, color: '#06b6d4' })
        })
      }
      if (Array.isArray(services)) {
        services.forEach((s: { id: string; name: string; protocol: string; ports: string; device?: { name: string } }) => {
          items.push({ id: s.id, type: 'service', title: s.name, subtitle: `${s.protocol.toUpperCase()}:${s.ports} ${s.device ? `\u00b7 ${s.device.name}` : ''}`, view: 'services', icon: Box, color: '#f97316' })
        })
      }
      setAllData(items)
    })
  }, [open])

  const results = useMemo(() => {
    if (!query.trim()) return allData.slice(0, 12)
    const q = query.toLowerCase()
    return allData.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.subtitle.toLowerCase().includes(q) ||
      r.type.includes(q)
    ).slice(0, 12)
  }, [query, allData])

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => {
          if (!prev) {
            setQuery('')
            setSelectedIdx(0)
            setTimeout(() => inputRef.current?.focus(), 50)
          }
          return !prev
        })
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const handleSelect = (result: SearchResult) => {
    onNavigate(result.view, result.id)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx])
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: '560px', maxHeight: '480px',
          background: 'var(--card-bg, #fff)', borderRadius: '14px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          border: '1px solid var(--border, #e2e8f0)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
          <Search size={18} color="#94a3b8" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search devices, subnets, VLANs, WiFi, services..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '15px',
              background: 'transparent', color: 'var(--text-primary, #1e293b)',
            }}
          />
          <kbd style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#f1f3f5', color: '#94a3b8', border: '1px solid #e2e8f0' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
          {results.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              {query ? 'No results found' : 'Loading...'}
            </div>
          ) : (
            <>
              {!query && (
                <div style={{ padding: '0.25rem 0.75rem 0.5rem', fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Quick Jump
                </div>
              )}
              {results.map((r, i) => {
                const Icon = r.icon
                return (
                  <div
                    key={`${r.type}-${r.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                      background: i === selectedIdx ? '#f1f5f9' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={() => setSelectedIdx(i)}
                    onClick={() => handleSelect(r)}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: `${r.color}12`, color: r.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subtitle}</div>
                    </div>
                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize', background: '#f1f3f5', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>{r.type}</span>
                    <ArrowRight size={12} color="#cbd5e1" />
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border, #e2e8f0)', padding: '0.5rem 1rem', display: 'flex', gap: '1rem', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>
          <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: '#f1f3f5', border: '1px solid #e2e8f0', marginRight: '3px' }}>&uarr;&darr;</kbd> Navigate</span>
          <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: '#f1f3f5', border: '1px solid #e2e8f0', marginRight: '3px' }}>Enter</kbd> Open</span>
          <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: '#f1f3f5', border: '1px solid #e2e8f0', marginRight: '3px' }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
