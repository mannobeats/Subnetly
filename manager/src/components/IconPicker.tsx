'use client'

import { useState, useRef, useEffect, type JSX } from 'react'
import { Search } from 'lucide-react'
import { ICON_MAP } from '@/lib/category-icons'

const ICON_NAMES = Object.keys(ICON_MAP)

function renderIcon(name: string, size: number, iconColor: string): JSX.Element {
  const Ic = ICON_MAP[name] || ICON_MAP['server']
  return <Ic size={size} color={iconColor} />
}

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  color?: string
}

export default function IconPicker({ value, onChange, color = 'var(--text-muted)' }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      setTimeout(() => searchRef.current?.focus(), 50)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filtered = search
    ? ICON_NAMES.filter(n => n.replace(/-/g, ' ').includes(search.toLowerCase()))
    : ICON_NAMES

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="unifi-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          padding: '0 10px',
          height: '34px',
          width: '100%',
          textAlign: 'left',
          background: 'var(--card-bg, #fff)',
        }}
      >
        {renderIcon(value, 14, color)}
        <span style={{ fontSize: '12px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
          <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            width: '280px',
            maxHeight: '320px',
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius, 8px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                type="text"
                className="unifi-input"
                placeholder="Search icons..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '28px', height: '30px', fontSize: '12px', width: '100%' }}
              />
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              alignContent: 'start',
            }}
          >
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '12px' }}>
                No icons found
              </div>
            )}
            {filtered.map(name => {
              const isSelected = name === value
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => { onChange(name); setOpen(false); setSearch('') }}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid var(--blue, #0055ff)' : '1px solid transparent',
                    background: isSelected ? 'var(--blue-bg, #eef5ff)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.background = 'var(--muted-bg, #f1f3f5)') }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = 'transparent') }}
                >
                  {renderIcon(name, 15, isSelected ? 'var(--blue, #0055ff)' : 'var(--text-muted, #5e6670)')}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
