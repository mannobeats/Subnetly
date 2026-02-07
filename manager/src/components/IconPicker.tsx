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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="unifi-input flex items-center gap-1.5 cursor-pointer px-2.5 h-[34px] w-full text-left bg-card"
      >
        {renderIcon(value, 14, color)}
        <span className="text-xs text-foreground truncate flex-1">{value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 opacity-40">
          <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[280px] max-h-[320px] bg-card border border-border rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-1000 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                className="unifi-input pl-7 h-[30px] text-xs w-full"
                placeholder="Search icons..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-7 gap-0.5 content-start">
            {filtered.length === 0 && (
              <div className="col-span-full text-center p-4 text-muted-foreground text-xs">
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
                  className={`w-[34px] h-[34px] rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-2 border-(--blue) bg-(--blue-bg)'
                      : 'border border-transparent hover:bg-(--muted-bg)'
                  }`}
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
