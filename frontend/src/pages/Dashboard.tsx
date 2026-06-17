import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Camera, Activity, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getDashboardSummary, getRecentViolations, getViolationTrend, getTopZones } from '../api'
import StatCard from '../components/StatCard'
import { StatusBadge } from '../components/ViolationBadge'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import type { Violation } from '../types'

const tt = { background: '#fff', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-body)', fontSize: 12 }

export default function Dashboard() {
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary, refetchInterval: 30000 })
  const { data: recentViolations } = useQuery({ queryKey: ['recent-violations'], queryFn: () => getRecentViolations(8), refetchInterval: 15000 })
  const { data: trendData } = useQuery({ queryKey: ['violation-trend'], queryFn: () => getViolationTrend(7) })
  const { data: topZones } = useQuery({ queryKey: ['top-zones'], queryFn: () => getTopZones(5) })

  const violations = summary?.violations
  const congestion = summary?.congestion
  const cameras = summary?.cameras

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fadein">
      <div>
        <h1 className="section-title">Operations Dashboard</h1>
        <p className="section-sub">Real-time parking enforcement overview</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard title="Violations Today" value={violations?.today ?? '—'}
          change={violations ? `${violations.change_percent > 0 ? '+' : ''}${violations.change_percent}% vs yesterday` : undefined}
          changePositive={violations ? violations.change_percent <= 0 : undefined}
          icon={violations && violations.change_percent > 0 ? TrendingUp : TrendingDown} color="red" />
        <StatCard title="Pending Review" value={violations?.pending_review ?? '—'}
          change="Awaiting officer action" icon={Clock} color="yellow" />
        <StatCard title="Active Cameras" value={cameras ? `${cameras.active}/${cameras.total}` : '—'}
          change={cameras ? `${cameras.inactive} offline` : undefined} changePositive={false}
          icon={Camera} color="blue" />
        <StatCard title="Congestion Level" value={congestion?.level ?? '—'}
          change={congestion ? `Score: ${congestion.current_avg_score}/100` : undefined}
          changePositive={congestion ? congestion.current_avg_score < 50 : true}
          icon={Activity}
          color={congestion?.level === 'High' ? 'red' : congestion?.level === 'Medium' ? 'yellow' : 'green'} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>7-Day Violation Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData?.trend ?? []}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-faint)', fontSize: 11 }} tickFormatter={v => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
              <Tooltip contentStyle={tt} />
              <Area type="monotone" dataKey="total" stroke="var(--primary)" fill="url(#grad1)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="confirmed" stroke="var(--accent)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Confirmed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>Top Zones (24h)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topZones?.zones ?? []} layout="vertical">
              <XAxis type="number" tick={{ fill: 'var(--text-faint)', fontSize: 10 }} />
              <YAxis type="category" dataKey="zone_name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={80} />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="violation_count" fill="var(--primary)" radius={[0, 4, 4, 0]} name="Violations" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', margin: 0 }}>Recent Violations</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead><tr><th className="th">ID</th><th className="th">Type</th><th className="th">Vehicle</th><th className="th">Plate</th><th className="th">Impact</th><th className="th">Status</th><th className="th">Time</th></tr></thead>
            <tbody>
              {(recentViolations ?? []).map((v: Violation) => (
                <tr key={v.id} className="table-row">
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <Link to={`/app/violations/${v.id}`} style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700, textDecoration: 'none' }}>#{v.id}</Link>
                  </td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-body)', textTransform: 'capitalize' }}>{v.violation_type?.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{v.vehicle_type}</td>
                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: 'var(--text-body)' }}>{v.plate_number ?? '—'}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: Number(v.congestion_impact_score ?? 0) > 60 ? 'var(--danger)' : Number(v.congestion_impact_score ?? 0) > 35 ? 'var(--accent)' : 'var(--success)' }}>
                      {Number(v.congestion_impact_score ?? 0).toFixed(0)}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 1rem' }}><StatusBadge status={v.status} /></td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                    {v.frame_timestamp ? format(new Date(v.frame_timestamp), 'HH:mm') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!recentViolations || !recentViolations.length) && (
            <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '2rem', fontSize: '0.875rem' }}>No recent violations</p>
          )}
        </div>
      </div>
    </div>
  )
}
