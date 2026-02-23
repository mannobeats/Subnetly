'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowUpRight, ArrowDownRight, Trash2, Clock } from 'lucide-react'
import { ChangeLogEntry } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

const actionColors: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  create: { bg: 'var(--green-bg)', color: 'var(--green)', icon: ArrowUpRight },
  update: { bg: 'var(--blue-bg)', color: 'var(--blue)', icon: ArrowDownRight },
  delete: { bg: 'var(--red-bg-subtle)', color: '#ef4444', icon: Trash2 },
}

const actionTypes = ['create', 'update', 'delete']

const ChangelogView = ({ searchTerm, selectedFilter = null }: { searchTerm: string; selectedFilter?: string | null }) => {
  const [logs, setLogs] = useState<ChangeLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [clearModalOpen, setClearModalOpen] = useState(false)

  const fetchLogs = useCallback(() => {
    fetch('/api/changelog')
      .then(r => r.json())
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = logs.filter(l => {
    const matchesSearch = !searchTerm ||
      l.objectType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.changes || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = !selectedFilter ||
      l.action === selectedFilter ||
      l.objectType === selectedFilter
    return matchesSearch && matchesFilter
  })

  const handleClearAll = async () => {
    const res = await fetch('/api/changelog', { method: 'DELETE' })
    if (res.ok) {
      setLogs([])
      setClearModalOpen(false)
    } else {
      alert('Failed to clear changelog')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-[200px] text-muted-foreground text-[13px]">Loading changelog...</div>

  // Stats
  const createCount = logs.filter(l => l.action === 'create').length
  const updateCount = logs.filter(l => l.action === 'update').length
  const deleteCount = logs.filter(l => l.action === 'delete').length

  return (
    <div className="animate-in fade-in duration-300">
      {/* Stats + Actions Bar */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex gap-6 items-center">
          <span className="text-xs text-muted-foreground">{logs.length} total entries</span>
          <div className="flex gap-3">
            <span className="text-[11px] flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-(--green)" />{createCount} created</span>
            <span className="text-[11px] flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-(--blue)" />{updateCount} updated</span>
            <span className="text-[11px] flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-[#ef4444]" />{deleteCount} deleted</span>
          </div>
          {selectedFilter && (
            <span className="text-[11px] bg-(--blue-bg) text-(--blue) px-2 py-0.5 rounded">
              Filtered: {actionTypes.includes(selectedFilter) ? selectedFilter : `type:${selectedFilter}`}
            </span>
          )}
        </div>
        {logs.length > 0 && (
          <Button variant="outline" size="sm" className="text-[#ef4444] text-xs" onClick={() => setClearModalOpen(true)}>
            <Trash2 size={12} /> Clear All Logs
          </Button>
        )}
      </div>

      <div className="flex flex-col">
        {filtered.map((log) => {
          const style = actionColors[log.action] || actionColors.update
          const Icon = style.icon
          let parsedChanges: Record<string, unknown> | null = null
          try { parsedChanges = log.changes ? JSON.parse(log.changes) : null } catch { /* ignore */ }

          return (
            <div key={log.id} className="flex gap-4 py-4 border-b border-border last:border-b-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: style.bg, color: style.color }}>
                <Icon size={14} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: style.color }}>
                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">{log.objectType}</span>
                </div>
                {parsedChanges && (
                  <div className="bg-(--surface-alt) border border-border rounded-md px-3 py-2 mb-2">
                    {Object.entries(parsedChanges).map(([key, val]) => (
                      <div key={key} className="flex gap-2 py-0.5 text-[11px]">
                        <span className="text-muted-foreground font-medium">{key}:</span>
                        <code className="text-[11px]">{String(val)}</code>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-(--text-light)">
                  <Clock size={10} />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-[13px]">{logs.length === 0 ? 'No changelog entries yet.' : 'No entries match the current filter.'}</div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      <Dialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <DialogContent className="max-w-[400px] text-center">
          <DialogHeader className="flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--red-bg-subtle) text-(--red)">
              <Trash2 size={24} />
            </div>
            <DialogTitle className="text-lg font-semibold">Clear All Logs?</DialogTitle>
            <DialogDescription className="mt-2">
              This will permanently delete all {logs.length} changelog entries. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-4 sm:justify-center">
            <Button variant="outline" onClick={() => setClearModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll}>Delete All Logs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChangelogView
