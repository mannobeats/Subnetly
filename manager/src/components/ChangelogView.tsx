'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowUpRight, ArrowDownRight, Trash2, Clock } from 'lucide-react'
import { ChangeLogEntry } from '@/types'

const actionColors: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  create: { bg: '#ecfdf5', color: '#10b981', icon: ArrowUpRight },
  update: { bg: '#eef5ff', color: '#0055ff', icon: ArrowDownRight },
  delete: { bg: '#fee2e2', color: '#ef4444', icon: Trash2 },
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

  if (loading) return <div className="view-loading">Loading changelog...</div>

  // Stats
  const createCount = logs.filter(l => l.action === 'create').length
  const updateCount = logs.filter(l => l.action === 'update').length
  const deleteCount = logs.filter(l => l.action === 'delete').length

  return (
    <div className="changelog-view animate-fade-in">
      {/* Stats + Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--unifi-text-muted)' }}>{logs.length} total entries</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />{createCount} created</span>
            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0055ff', display: 'inline-block' }} />{updateCount} updated</span>
            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />{deleteCount} deleted</span>
          </div>
          {selectedFilter && (
            <span style={{ fontSize: '11px', background: '#eef5ff', color: '#0055ff', padding: '2px 8px', borderRadius: '4px' }}>
              Filtered: {actionTypes.includes(selectedFilter) ? selectedFilter : `type:${selectedFilter}`}
            </span>
          )}
        </div>
        {logs.length > 0 && (
          <button className="btn" style={{ color: '#ef4444', fontSize: '12px' }} onClick={() => setClearModalOpen(true)}>
            <Trash2 size={12} /> Clear All Logs
          </button>
        )}
      </div>

      <div className="changelog-timeline">
        {filtered.map((log) => {
          const style = actionColors[log.action] || actionColors.update
          const Icon = style.icon
          let parsedChanges: Record<string, unknown> | null = null
          try { parsedChanges = log.changes ? JSON.parse(log.changes) : null } catch { /* ignore */ }

          return (
            <div key={log.id} className="changelog-entry">
              <div className="changelog-icon" style={{ background: style.bg, color: style.color }}>
                <Icon size={14} />
              </div>
              <div className="changelog-content">
                <div className="changelog-header">
                  <span className="changelog-action" style={{ color: style.color }}>
                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                  </span>
                  <span className="changelog-type">{log.objectType}</span>
                </div>
                {parsedChanges && (
                  <div className="changelog-changes">
                    {Object.entries(parsedChanges).map(([key, val]) => (
                      <div key={key} className="changelog-change-row">
                        <span className="changelog-key">{key}:</span>
                        <code className="changelog-val">{String(val)}</code>
                      </div>
                    ))}
                  </div>
                )}
                <div className="changelog-time">
                  <Clock size={10} />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="view-loading">{logs.length === 0 ? 'No changelog entries yet.' : 'No entries match the current filter.'}</div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {clearModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ background: '#fee2e2', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#dc2626' }}><Trash2 size={24} /></div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '18px', fontWeight: 600 }}>Clear All Logs?</h2>
            <p style={{ color: 'var(--unifi-text-muted)', marginBottom: '2rem' }}>This will permanently delete all {logs.length} changelog entries. This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setClearModalOpen(false)}>Cancel</button>
              <button className="btn btn-destructive" onClick={handleClearAll}>Delete All Logs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChangelogView
