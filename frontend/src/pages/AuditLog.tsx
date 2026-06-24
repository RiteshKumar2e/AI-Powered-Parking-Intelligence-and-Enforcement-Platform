import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import apiClient from '../api/client'
import PageWrapper from '../components/PageWrapper'

type AuditEntry = {
  id: number
  actor_id?: number
  actor_role?: string
  action: string
  entity_type?: string
  entity_id?: number
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

const ACTION_COLOR: Record<string, string> = {
  create: '#16A34A',
  update: '#2563EB',
  delete: '#DC2626',
  login:  '#7C3AED',
}

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLOR).find(k => action.includes(k))
  return key ? ACTION_COLOR[key] : '#6B7280'
}

export default function AuditLog() {
  const [entityType, setEntityType] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const { data: logs = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit', entityType, actionFilter],
    queryFn: () => apiClient.get('/audit', {
      params: {
        ...(entityType ? { entity_type: entityType } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
        limit: 200,
      },
    }).then(r => r.data),
  })

  return (
    <PageWrapper>
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={20} style={{ color: 'var(--primary)' }} /> Audit Log
        </h1>
        <p className="section-sub">Tamper-evident record of all system actions (admin only)</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 200 }} placeholder="Filter by entity type..." value={entityType} onChange={e => setEntityType(e.target.value)} />
        <input className="input" style={{ maxWidth: 200 }} placeholder="Filter by action..." value={actionFilter} onChange={e => setActionFilter(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-faint)' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.875rem' }}>
            No audit entries found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
                {['Time', 'Actor', 'Action', 'Entity', 'ID', 'IP'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '8px 14px', fontSize: '0.75rem', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)' }}>#{log.actor_id ?? '—'}</div>
                    {log.actor_role && <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'capitalize' }}>{log.actor_role}</div>}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 700, background: actionColor(log.action) + '18', color: actionColor(log.action) }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '8px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.entity_type || '—'}</td>
                  <td style={{ padding: '8px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.entity_id ?? '—'}</td>
                  <td style={{ padding: '8px 14px', fontSize: '0.72rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageWrapper>
  )
}
