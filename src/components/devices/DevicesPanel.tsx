'use client'

import { Edit2, Server, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { renderCategoryIcon } from '@/lib/category-icons'
import { CustomCategory, Device } from '@/types'

interface DevicesPanelProps {
  loading: boolean
  devices: Device[]
  filteredDevices: Device[]
  categories: CustomCategory[]
  highlightId: string | null
  onAddDevice: () => void
  onEditDevice: (device: Device) => void
  onDeleteDevice: (id: string) => void
}

export default function DevicesPanel({
  loading,
  devices,
  filteredDevices,
  categories,
  highlightId,
  onAddDevice,
  onEditDevice,
  onDeleteDevice,
}: DevicesPanelProps) {
  if (loading) {
    return (
      <div className="flex-1 overflow-auto p-4 px-6">
        <div className="flex items-center justify-center h-[220px] text-muted-foreground text-[13px]">
          <Server size={16} className="mr-2 text-[#cbd5e1]" /> Loading devices...
        </div>
      </div>
    )
  }

  if (!loading && devices.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-4 px-6">
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-lg">
          <Server size={40} className="text-[#cbd5e1]" />
          <h3 className="text-base font-semibold mt-4 mb-2">No devices yet</h3>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-[360px]">Add your first device to start managing your infrastructure.</p>
          <Button onClick={onAddDevice}>
            Add Device
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-8 px-6 py-4 bg-card border-b border-border">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">Total Devices</span>
          <span className="text-lg font-bold text-(--blue)">{devices.length}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">Networking</span>
          <span className="text-lg font-bold text-(--blue)">{devices.filter(d => d.category === 'Networking').length}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">VMs & Containers</span>
          <span className="text-lg font-bold text-(--blue)">{devices.filter(d => ['VM', 'LXC'].includes(d.category)).length}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">Active</span>
          <span className="text-lg font-bold text-(--blue)">{devices.filter(d => d.status === 'active').length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 px-6">
        <div className="animate-in fade-in duration-300 bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th className="w-[180px]">Name</th>
                <th className="w-[120px]">IP Address</th>
                <th className="w-[160px]">MAC Address</th>
                <th className="w-[100px]">Category</th>
                <th className="w-[100px]">Status</th>
                <th className="w-[140px]">Platform</th>
                <th className="w-20 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr><td colSpan={8} className="text-center h-[100px] text-muted-foreground">No devices match your search.</td></tr>
              ) : filteredDevices.map((device) => (
                <tr key={device.id} data-highlight-id={device.id} className={highlightId === device.id ? 'highlight-flash' : ''}>
                  <td className="text-center">
                    {(() => {
                      const cat = categories.find(c => c.name === device.category)
                      return cat ? renderCategoryIcon(cat.icon, 14, cat.color) : <Server size={14} className="text-(--text-slate)" />
                    })()}
                  </td>
                  <td className="font-medium">{device.name}</td>
                  <td><code className="text-[11px] bg-(--muted-bg) px-1.5 py-0.5 rounded">{device.ipAddress}</code></td>
                  <td className="text-(--text-slate) font-mono text-xs">{device.macAddress}</td>
                  <td>
                    {(() => {
                      const cat = categories.find(c => c.name === device.category)
                      const color = cat?.color || '#5e6670'
                      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: color + '18', color }}>{device.category}</span>
                    })()}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: device.status === 'active' ? '#22c55e' : device.status === 'offline' ? '#ef4444' : '#94a3b8' }} />
                      <span className="text-xs">{device.status}</span>
                    </div>
                  </td>
                  <td className="text-(--text-slate) text-xs">{device.platform || '—'}</td>
                  <td className="text-right pr-4">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditDevice(device)} title="Edit"><Edit2 size={12} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:text-[#ef4444]" onClick={() => onDeleteDevice(device.id)} title="Delete"><Trash2 size={12} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

