'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, Trash2, Clock } from 'lucide-react'
import { ChangeLogEntry } from '@/types'

const actionColors: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  create: { bg: '#ecfdf5', color: '#10b981', icon: ArrowUpRight },
  update: { bg: '#eef5ff', color: '#0055ff', icon: ArrowDownRight },
  delete: { bg: '#fee2e2', color: '#ef4444', icon: Trash2 },
}

const ChangelogView = ({ searchTerm }: { searchTerm: string }) => {
  const [logs, setLogs] = useState<ChangeLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/changelog')
      .then(r => r.json())
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l =>
    l.objectType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.changes || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="view-loading">Loading changelog...</div>

  return (
    <div className="changelog-view animate-fade-in">
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
          <div className="view-loading">No changelog entries found.</div>
        )}
      </div>
    </div>
  )
}

export default ChangelogView
