import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import apiClient from '../api/client'
import PageWrapper from '../components/PageWrapper'

type Payment = {
  id: number
  violation_id: number
  ticket_number: string
  amount_due: number
  amount_paid: number
  payment_status: string
  due_date?: string
  paid_at?: string
  payment_method?: string
  escalation_count: number
  notes?: string
  created_at: string
}

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  unpaid:    { bg: '#FEF3C7', color: '#92400E', icon: <Clock size={11} />,        label: 'Unpaid' },
  paid:      { bg: '#D1FAE5', color: '#065F46', icon: <CheckCircle size={11} />,  label: 'Paid' },
  partial:   { bg: '#DBEAFE', color: '#1E40AF', icon: <CreditCard size={11} />,   label: 'Partial' },
  overdue:   { bg: '#FEE2E2', color: '#991B1B', icon: <AlertCircle size={11} />,  label: 'Overdue' },
  escalated: { bg: '#FEE2E2', color: '#7F1D1D', icon: <AlertCircle size={11} />,  label: 'Escalated' },
  waived:    { bg: '#F3F4F6', color: '#4B5563', icon: <CheckCircle size={11} />,  label: 'Waived' },
}

const STATUSES = ['unpaid', 'paid', 'partial', 'overdue', 'escalated', 'waived']

export default function Payments() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['payments', filterStatus],
    queryFn: () => apiClient.get('/payments', { params: filterStatus ? { payment_status: filterStatus } : {} }).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiClient.patch(`/payments/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); toast.success('Payment updated'); setUpdatingId(null) },
    onError: () => toast.error('Update failed'),
  })

  const sweepMutation = useMutation({
    mutationFn: () => apiClient.post('/payments/overdue-sweep').then(r => r.data),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['payments'] }); toast.success(`Swept ${data.swept} overdue payments`) },
    onError: () => toast.error('Sweep failed'),
  })

  const markPaid = (payment: Payment) => {
    updateMutation.mutate({ id: payment.id, data: { payment_status: 'paid', amount_paid: payment.amount_due, payment_method: 'cash' } })
  }

  const stats = {
    unpaid:  payments.filter(p => p.payment_status === 'unpaid').length,
    overdue: payments.filter(p => p.payment_status === 'overdue' || p.payment_status === 'escalated').length,
    paid:    payments.filter(p => p.payment_status === 'paid').length,
    total:   payments.reduce((s, p) => s + p.amount_due, 0),
    collected: payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + p.amount_paid, 0),
  }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={20} style={{ color: 'var(--primary)' }} /> Fine Payments
          </h1>
          <p className="section-sub">Track, collect, and escalate parking fines</p>
        </div>
        <button onClick={() => sweepMutation.mutate()} disabled={sweepMutation.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          <RefreshCw size={13} /> {sweepMutation.isPending ? 'Running...' : 'Run Overdue Sweep'}
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Unpaid', val: stats.unpaid, clr: '#D97706' },
          { label: 'Overdue', val: stats.overdue, clr: '#DC2626' },
          { label: 'Paid', val: stats.paid, clr: '#16A34A' },
          { label: 'Total Due', val: `₹${stats.total.toLocaleString()}`, clr: 'var(--text-heading)' },
          { label: 'Collected', val: `₹${stats.collected.toLocaleString()}`, clr: 'var(--primary)' },
        ].map(({ label, val, clr }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: clr }}>{val}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: '4px 12px', borderRadius: 9999, border: '1.5px solid', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
              borderColor: filterStatus === s ? 'var(--primary)' : 'var(--border-light)',
              background: filterStatus === s ? 'var(--primary)' : 'transparent',
              color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
            }}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-faint)' }}>Loading...</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.875rem' }}>
            No payment records{filterStatus ? ` with status "${filterStatus}"` : ''}.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
                {['Ticket #', 'Violation', 'Amount Due', 'Paid', 'Status', 'Due Date', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => {
                const st = STATUS_STYLE[p.payment_status] ?? STATUS_STYLE.unpaid
                const isOverdue = p.due_date && new Date(p.due_date) < new Date() && p.payment_status === 'unpaid'
                return (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--border-light)', background: isOverdue ? '#FFFBEB' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>{p.ticket_number}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{p.violation_id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-heading)' }}>₹{p.amount_due.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: p.amount_paid > 0 ? '#16A34A' : 'var(--text-faint)' }}>₹{p.amount_paid.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, background: st.bg, color: st.color, fontSize: '0.7rem', fontWeight: 700 }}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: isOverdue ? '#DC2626' : 'var(--text-faint)', fontWeight: isOverdue ? 700 : 400 }}>
                      {p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.payment_status !== 'paid' && p.payment_status !== 'waived' && (
                        <button onClick={() => { setUpdatingId(p.id); markPaid(p) }} disabled={updateMutation.isPending && updatingId === p.id}
                          style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #16A34A', background: '#F0FDF4', color: '#16A34A', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                          Mark Paid
                        </button>
                      )}
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
