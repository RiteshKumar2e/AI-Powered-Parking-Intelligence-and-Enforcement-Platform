import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Filter, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { getViolations, getViolationStats } from '../api'
import { StatusBadge } from '../components/ViolationBadge'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Violation } from '../types'

const VIOLATION_TYPES = [
  'illegal_parking','no_parking_zone','double_parking','blocking_intersection',
  'pavement_parking','bus_stop_parking','wrong_side_driving','red_light_violation',
  'stop_line_violation','helmet_non_compliance','seatbelt_non_compliance','triple_riding',
]

const STATUS_OPTIONS = ['pending_review','confirmed','dismissed','ticket_issued']
const COLORS = ['#3b82f6','#ef4444','#f59e0b','#22c55e','#8b5cf6','#ec4899','#14b8a6','#f97316']

export default function Violations() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [vtype, setVtype] = useState('')
  const [hoursBack, setHoursBack] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['violations', page, status, vtype, hoursBack],
    queryFn: () => getViolations({
      page, size: 20,
      ...(status && { status }),
      ...(vtype && { violation_type: vtype }),
      ...(hoursBack && { hours_back: hoursBack }),
    }),
    refetchInterval: 30000,
  })

  const { data: stats } = useQuery({
    queryKey: ['violation-stats', hoursBack],
    queryFn: () => getViolationStats(hoursBack ? Number(hoursBack) : 24),
    refetchInterval: 60000,
  })

  const pieData = stats ? Object.entries(stats.by_type || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value: value as number,
  })) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Violations</h1>
          <p className="text-sm text-gray-400">All detected parking and traffic violations</p>
        </div>
      </div>

      {/* Stats + Pie */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="card col-span-3 grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'Pending', value: stats.by_status?.pending_review || 0, color: 'text-yellow-400' },
              { label: 'Confirmed', value: stats.by_status?.confirmed || 0, color: 'text-blue-400' },
              { label: 'Issued', value: stats.by_status?.ticket_issued || 0, color: 'text-green-400' },
              { label: 'Dismissed', value: stats.by_status?.dismissed || 0, color: 'text-gray-400' },
              { label: 'Avg Impact', value: `${stats.avg_congestion_impact}/100`, color: 'text-orange-400' },
            ].map(s => (
              <div key={s.label} className="text-center py-1">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card col-span-2">
            <p className="text-xs text-gray-500 mb-2">By Violation Type</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={15} className="text-gray-500" />
        <select className="input w-auto" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="input w-auto" value={vtype} onChange={e => { setVtype(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          {VIOLATION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="input w-auto" value={hoursBack} onChange={e => { setHoursBack(e.target.value); setPage(1) }}>
          <option value="">All Time</option>
          <option value="1">Last 1h</option>
          <option value="6">Last 6h</option>
          <option value="24">Last 24h</option>
          <option value="72">Last 3 days</option>
          <option value="168">Last 7 days</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Vehicle</th>
              <th className="text-left px-4 py-3">Plate</th>
              <th className="text-left px-4 py-3">Congestion</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Fine</th>
              <th className="text-left px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="text-center text-gray-500 py-8">Loading...</td></tr>
            )}
            {data?.items.map((v: Violation) => (
              <tr key={v.id} className="table-row">
                <td className="px-4 py-3">
                  <Link to={`/violations/${v.id}`} className="text-blue-400 hover:text-blue-300 font-mono">
                    #{v.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-200 capitalize">{v.violation_type?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-gray-400 capitalize">{v.vehicle_type}</td>
                <td className="px-4 py-3 font-mono text-gray-200">{v.plate_number ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${v.congestion_impact_score > 60 ? 'bg-red-500' : v.congestion_impact_score > 35 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${v.congestion_impact_score}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{v.congestion_impact_score?.toFixed(0)}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-3 text-gray-300">₹{v.fine_amount?.toFixed(0)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {v.frame_timestamp ? format(new Date(v.frame_timestamp), 'MMM d, HH:mm') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-sm">
            <span className="text-gray-500">{data.total} total violations</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-gray-400">Page {page} of {data.pages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
