import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import apiClient from '../api/client'
import PageWrapper from '../components/PageWrapper'

type Dispute = {
  id: number
  violation_id: number
  submitted_by_name: string
  submitted_by_contact: string
  reason_category: string
  description: string
  status: string
  resolution_notes?: string
  submitted_at: string
  resolved_at?: string
}

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  pending:      { bg: '#FEF3C7', color: '#92400E', icon: <Clock size={11} /> },
  under_review: { bg: '#DBEAFE', color: '#1E40AF', icon: <Clock size={11} /> },
  approved:     { bg: '#D1FAE5', color: '#065F46', icon: <CheckCircle size={11} /> },
  rejected:     { bg: '#FEE2E2', color: '#991B1B', icon: <XCircle size={11} /> },
}

export default function Disputes() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [resolution, setResolution] = useState({ status: 'approved', notes: '' })

  const { data: disputes = [], isLoading } = useQuery<Dispute[]>({
    queryKey: ['disputes', filterStatus],
    queryFn: () => apiClient.get('/disputes', { params: filterStatus ? { status: filterStatus } : {} }).then(r => r.data),
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof resolution }) =>
      apiClient.patch(`/disputes/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disputes'] })
      toast.success('Dispute resolved')
      setSelected(null)
    },
    onError: () => toast.error('Failed to resolve'),
  })

  const stats = {
    pending: disputes.filter(d => d.status === 'pending').length,
    under_review: disputes.filter(d => d.status === 'under_review').length,
    approved: disputes.filter(d => d.status === 'approved').length,
    rejected: disputes.filter(d => d.status === 'rejected').length,
  }

  return (
    <PageWrapper>
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={20} style={{ color: 'var(--primary)' }} /> Dispute Management
        </h1>
        <p className="section-sub">Review and resolve vehicle owner appeals</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Pending', val: stats.pending, clr: '#D97706' },
          { label: 'Under Review', val: stats.under_review, clr: '#2563EB' },
          { label: 'Approved', val: stats.approved, clr: '#16A34A' },
          { label: 'Rejected', val: stats.rejected, clr: '#DC2626' },
        ].map(({ label, val, clr }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: clr }}>{val}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['', 'pending', 'under_review', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: '4px 12px', borderRadius: 9999, border: '1.5px solid', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              borderColor: filterStatus === s ? 'var(--primary)' : 'var(--border-light)',
              background: filterStatus === s ? 'var(--primary)' : 'transparent',
              color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
            }}>
            {s ? s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 14 }}>
        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-faint)' }}>Loading...</div>
          ) : disputes.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.875rem' }}>
              No disputes found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
                  {['Violation', 'Submitted By', 'Reason', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disputes.map((d, i) => {
                  const st = STATUS_STYLE[d.status] ?? STATUS_STYLE.pending
                  return (
                    <motion.tr key={d.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      onClick={() => setSelected(selected?.id === d.id ? null : d)}
                      style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', background: selected?.id === d.id ? 'var(--primary-faint)' : 'transparent', transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (selected?.id !== d.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)' }}
                      onMouseLeave={e => { if (selected?.id !== d.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>#{d.violation_id}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-body)' }}>{d.submitted_by_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{d.submitted_by_contact}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{d.reason_category.replace('_', ' ')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, background: st.bg, color: st.color, fontSize: '0.7rem', fontWeight: 700 }}>
                          {st.icon} {d.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{new Date(d.submitted_at).toLocaleDateString()}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-heading)' }}>Dispute #{selected.id}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
              {[
                ['Violation', `#${selected.violation_id}`],
                ['Submitted By', selected.submitted_by_name],
                ['Contact', selected.submitted_by_contact],
                ['Reason', selected.reason_category.replace(/_/g, ' ')],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: 'var(--text-body)', textAlign: 'right', maxWidth: '60%', textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}
              <div>
                <div style={{ color: 'var(--text-faint)', fontWeight: 600, marginBottom: 4 }}>Description</div>
                <div style={{ color: 'var(--text-body)', lineHeight: 1.5, fontSize: '0.78rem', background: 'var(--bg-subtle)', borderRadius: 8, padding: '0.6rem' }}>{selected.description}</div>
              </div>
            </div>

            {(selected.status === 'pending' || selected.status === 'under_review') && (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Resolution</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['approved', 'rejected'].map(s => (
                    <button key={s} onClick={() => setResolution(r => ({ ...r, status: s }))}
                      style={{ flex: 1, padding: '0.45rem', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize',
                        borderColor: resolution.status === s ? (s === 'approved' ? '#16A34A' : '#DC2626') : 'var(--border)',
                        background: resolution.status === s ? (s === 'approved' ? '#F0FDF4' : '#FEF2F2') : 'transparent',
                        color: resolution.status === s ? (s === 'approved' ? '#16A34A' : '#DC2626') : 'var(--text-muted)',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
                <textarea className="input" placeholder="Resolution notes..." rows={3} value={resolution.notes}
                  onChange={e => setResolution(r => ({ ...r, notes: e.target.value }))}
                  style={{ resize: 'none', fontSize: '0.8rem' }} />
                <button className="btn-primary" onClick={() => resolveMutation.mutate({ id: selected.id, data: resolution })} disabled={resolveMutation.isPending}>
                  {resolveMutation.isPending ? 'Saving...' : 'Submit Resolution'}
                </button>
              </div>
            )}

            {selected.resolution_notes && (
              <div style={{ background: 'var(--bg-subtle)', borderRadius: 10, padding: '0.7rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <strong>Resolution:</strong> {selected.resolution_notes}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  )
}
