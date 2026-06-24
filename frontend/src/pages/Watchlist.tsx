import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldAlert, Plus, Trash2, AlertTriangle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import apiClient from '../api/client'
import PageWrapper from '../components/PageWrapper'

type WatchlistEntry = {
  id: number
  plate_number: string
  reason: string
  alert_level: string
  notes?: string
  is_active: boolean
  created_at: string
}

const REASONS = [
  { value: 'stolen', label: 'Stolen Vehicle' },
  { value: 'warrant', label: 'Active Warrant' },
  { value: 'unpaid_fines', label: 'Unpaid Fines' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'other', label: 'Other' },
]

const LEVEL_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  critical: { bg: '#FEE2E2', color: '#B91C1C', icon: <AlertTriangle size={12} /> },
  warning:  { bg: '#FEF3C7', color: '#92400E', icon: <AlertTriangle size={12} /> },
  info:     { bg: '#DBEAFE', color: '#1E40AF', icon: <Info size={12} /> },
}

export default function Watchlist() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plate_number: '', reason: 'stolen', alert_level: 'warning', notes: '' })

  const { data: entries = [], isLoading } = useQuery<WatchlistEntry[]>({
    queryKey: ['watchlist'],
    queryFn: () => apiClient.get('/watchlist').then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.post('/watchlist', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success('Added to watchlist')
      setShowForm(false)
      setForm({ plate_number: '', reason: 'stolen', alert_level: 'warning', notes: '' })
    },
    onError: () => toast.error('Failed to add'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/watchlist/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); toast.success('Removed') },
    onError: () => toast.error('Failed to remove'),
  })

  const inp: React.CSSProperties = { width: '100%', marginTop: 0 }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={20} style={{ color: 'var(--danger)' }} /> Watchlist
          </h1>
          <p className="section-sub">Wanted, stolen, and flagged vehicles — real-time alerts on detection</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add Vehicle
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 16 }}
          >
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)' }}>Add to Watchlist</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Plate Number *</label>
                  <input className="input" style={inp} value={form.plate_number} onChange={e => setForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))} placeholder="e.g. KA01AB1234" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Reason *</label>
                  <select className="input" style={inp} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                    {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Alert Level</label>
                  <select className="input" style={inp} value={form.alert_level} onChange={e => setForm(f => ({ ...f, alert_level: e.target.value }))}>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Notes</label>
                  <input className="input" style={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional details" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={() => addMutation.mutate(form)} disabled={!form.plate_number || addMutation.isPending}>
                  {addMutation.isPending ? 'Adding...' : 'Add to Watchlist'}
                </button>
                <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-faint)' }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.875rem' }}>
            No vehicles on watchlist. Add flagged plates above.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
                {['Plate', 'Reason', 'Alert Level', 'Notes', 'Added', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const lvl = LEVEL_STYLE[e.alert_level] ?? LEVEL_STYLE.info
                return (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>{e.plate_number}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-body)', textTransform: 'capitalize' }}>{e.reason.replace('_', ' ')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, background: lvl.bg, color: lvl.color, fontSize: '0.7rem', fontWeight: 700 }}>
                        {lvl.icon} {e.alert_level.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{new Date(e.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => removeMutation.mutate(e.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 6 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageWrapper>
  )
}
