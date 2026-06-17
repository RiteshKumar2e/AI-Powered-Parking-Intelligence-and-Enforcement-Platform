import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { getViolations, getViolationStats } from '../api'
import { StatusBadge } from '../components/ViolationBadge'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Violation } from '../types'
import PageWrapper from '../components/PageWrapper'

const VTYPES = ['illegal_parking','no_parking_zone','double_parking','blocking_intersection','pavement_parking','bus_stop_parking','wrong_side_driving','red_light_violation','stop_line_violation','helmet_non_compliance','seatbelt_non_compliance','triple_riding']
const STATUSES = ['pending_review','confirmed','dismissed','ticket_issued']
const PIE_COLORS = ['#3E6B1A','#C8900A','#2563EB','#16A34A','#7C3AED','#DB2777','#0891B2','#EA580C']
const tt = { background: '#fff', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-body)', fontSize: 11 }

export default function Violations() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [vtype, setVtype] = useState('')
  const [hoursBack, setHoursBack] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['violations', page, status, vtype, hoursBack],
    queryFn: () => getViolations({ page, size: 20, ...(status && { status }), ...(vtype && { violation_type: vtype }), ...(hoursBack && { hours_back: hoursBack }) }),
    refetchInterval: 30000,
  })
  const { data: stats } = useQuery({ queryKey: ['violation-stats', hoursBack], queryFn: () => getViolationStats(hoursBack ? Number(hoursBack) : 24), refetchInterval: 60000 })
  const pieData = stats ? Object.entries(stats.by_type || {}).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value: value as number })) : []

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 className="section-title">Violations</h1>
        <p className="section-sub">All detected parking and traffic violations</p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Total', value: stats.total, color: 'var(--text-heading)' },
              { label: 'Pending', value: stats.by_status?.pending_review || 0, color: 'var(--accent)' },
              { label: 'Confirmed', value: stats.by_status?.confirmed || 0, color: '#2563EB' },
              { label: 'Issued', value: stats.by_status?.ticket_issued || 0, color: 'var(--success)' },
              { label: 'Dismissed', value: stats.by_status?.dismissed || 0, color: 'var(--text-faint)' },
              { label: 'Avg Impact', value: `${stats.avg_congestion_impact}/100`, color: '#c45000' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>By Violation Type</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tt} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Filter size={14} style={{ color: 'var(--text-faint)' }} />
        {[
          { val: status, set: (v: string) => { setStatus(v); setPage(1) }, opts: STATUSES, placeholder: 'All Statuses' },
          { val: vtype, set: (v: string) => { setVtype(v); setPage(1) }, opts: VTYPES, placeholder: 'All Types' },
        ].map((f, i) => (
          <select key={i} className="input" style={{ width: 'auto' }} value={f.val} onChange={e => f.set(e.target.value)}>
            <option value="">{f.placeholder}</option>
            {f.opts.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </select>
        ))}
        <select className="input" style={{ width: 'auto' }} value={hoursBack} onChange={e => { setHoursBack(e.target.value); setPage(1) }}>
          <option value="">All Time</option>
          {[['1','Last 1h'],['6','Last 6h'],['24','Last 24h'],['72','Last 3 days'],['168','Last 7 days']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead><tr><th className="th">ID</th><th className="th">Type</th><th className="th">Vehicle</th><th className="th">Plate</th><th className="th">Congestion</th><th className="th">Status</th><th className="th">Fine</th><th className="th">Timestamp</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '2rem' }}>Loading…</td></tr>}
            {data?.items.map((v: Violation) => (
              <tr key={v.id} className="table-row">
                <td style={{ padding: '0.65rem 1rem' }}><Link to={`/app/violations/${v.id}`} style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700, textDecoration: 'none' }}>#{v.id}</Link></td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-body)', textTransform: 'capitalize' }}>{v.violation_type?.replace(/_/g, ' ')}</td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{v.vehicle_type}</td>
                <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: 'var(--text-body)' }}>{v.plate_number ?? '—'}</td>
                <td style={{ padding: '0.65rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, background: 'var(--bg-subtle)', borderRadius: 9999, height: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 9999, background: v.congestion_impact_score > 60 ? 'var(--danger)' : v.congestion_impact_score > 35 ? 'var(--accent)' : 'var(--success)', width: `${v.congestion_impact_score}%` }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.congestion_impact_score?.toFixed(0)}</span>
                  </div>
                </td>
                <td style={{ padding: '0.65rem 1rem' }}><StatusBadge status={v.status} /></td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>₹{v.fine_amount?.toFixed(0)}</td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-faint)', fontSize: '0.75rem' }}>{v.frame_timestamp ? format(new Date(v.frame_timestamp), 'MMM d, HH:mm') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{data.total} total</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', opacity: page === 1 ? 0.3 : 1 }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Page {page} of {data.pages}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page >= data.pages} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', opacity: page >= data.pages ? 0.3 : 1 }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </PageWrapper>
  )
}

