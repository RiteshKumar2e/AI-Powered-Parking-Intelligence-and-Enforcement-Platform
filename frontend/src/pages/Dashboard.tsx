import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Camera, Activity, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getDashboardSummary, getRecentViolations, getViolationTrend, getTopZones } from '../api'
import StatCard from '../components/StatCard'
import { StatusBadge } from '../components/ViolationBadge'
import { format } from 'date-fns'
import type { Violation } from '../types'

export default function Dashboard() {
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary, refetchInterval: 30000 })
  const { data: recentViolations } = useQuery({ queryKey: ['recent-violations'], queryFn: () => getRecentViolations(8), refetchInterval: 15000 })
  const { data: trendData } = useQuery({ queryKey: ['violation-trend'], queryFn: () => getViolationTrend(7) })
  const { data: topZones } = useQuery({ queryKey: ['top-zones'], queryFn: () => getTopZones(5) })

  const violations = summary?.violations
  const congestion = summary?.congestion
  const cameras = summary?.cameras

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Operations Dashboard</h1>
        <p className="text-sm text-gray-400">Real-time parking enforcement overview</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Violations Today"
          value={violations?.today ?? '—'}
          change={violations ? `${violations.change_percent > 0 ? '+' : ''}${violations.change_percent}% vs yesterday` : undefined}
          changePositive={violations ? violations.change_percent <= 0 : undefined}
          icon={violations && violations.change_percent > 0 ? TrendingUp : TrendingDown}
          color="red"
        />
        <StatCard
          title="Pending Review"
          value={violations?.pending_review ?? '—'}
          change="Awaiting officer action"
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Active Cameras"
          value={cameras ? `${cameras.active}/${cameras.total}` : '—'}
          change={cameras ? `${cameras.inactive} offline` : undefined}
          changePositive={false}
          icon={Camera}
          color="blue"
        />
        <StatCard
          title="Congestion Level"
          value={congestion?.level ?? '—'}
          change={congestion ? `Score: ${congestion.current_avg_score}/100` : undefined}
          changePositive={congestion ? congestion.current_avg_score < 50 : true}
          icon={Activity}
          color={congestion?.level === 'High' ? 'red' : congestion?.level === 'Medium' ? 'yellow' : 'green'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="card col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-4">7-Day Violation Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData?.trend ?? []}>
              <defs>
                <linearGradient id="violGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#violGrad)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="confirmed" stroke="#22c55e" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Confirmed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Zones */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Top Violation Zones (24h)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topZones?.zones ?? []} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis type="category" dataKey="zone_name" tick={{ fill: '#9ca3af', fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }} />
              <Bar dataKey="violation_count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Violations" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          Recent Violations
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 pr-4">ID</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2 pr-4">Vehicle</th>
                <th className="text-left py-2 pr-4">Plate</th>
                <th className="text-left py-2 pr-4">Impact</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-left py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {(recentViolations ?? []).map((v: Violation) => (
                <tr key={v.id} className="table-row">
                  <td className="py-2.5 pr-4 text-blue-400 font-mono">#{v.id}</td>
                  <td className="py-2.5 pr-4 text-gray-200 capitalize">{v.violation_type?.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-gray-400 capitalize">{v.vehicle_type}</td>
                  <td className="py-2.5 pr-4 font-mono text-gray-200">{v.plate_number ?? '—'}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`font-medium ${v.congestion_impact > 60 ? 'text-red-400' : v.congestion_impact > 35 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {Number(v.congestion_impact ?? 0).toFixed(0)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4"><StatusBadge status={v.status} /></td>
                  <td className="py-2.5 text-gray-500 text-xs">
                    {v.timestamp ? format(new Date(v.timestamp), 'HH:mm') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!recentViolations || recentViolations.length === 0) && (
            <p className="text-center text-gray-600 py-6 text-sm">No recent violations</p>
          )}
        </div>
      </div>
    </div>
  )
}
