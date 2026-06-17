import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { getForecast, getRecommendations } from '../api'
import { RiskBadge } from '../components/ViolationBadge'
import { TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Prediction } from '../types'
import 'leaflet/dist/leaflet.css'

const CENTER: [number, number] = [19.0760, 72.8777]
const RISK_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }

export default function Predictions() {
  const { data: forecastData } = useQuery({ queryKey: ['forecast'], queryFn: () => getForecast(24), refetchInterval: 300000 })
  const { data: recData } = useQuery({ queryKey: ['recommendations'], queryFn: getRecommendations, refetchInterval: 300000 })

  const predictions = forecastData?.predictions ?? []
  const recommendations = recData?.recommendations ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Predictive Analytics</h1>
        <p className="text-sm text-gray-400">AI-powered hotspot forecasting and enforcement optimization</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Forecast Map */}
        <div className="card p-0 overflow-hidden" style={{ height: 400 }}>
          <div className="px-4 pt-3 pb-2">
            <h3 className="text-sm font-medium text-gray-300">Predicted Risk Map (Next 24h)</h3>
          </div>
          <MapContainer center={CENTER} zoom={12} style={{ height: 350 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {predictions.map((p: Prediction, i: number) => (
              <CircleMarker
                key={i}
                center={[p.latitude, p.longitude]}
                radius={8 + p.predicted_violation_count * 0.8}
                fillColor={RISK_COLORS[p.risk_level] ?? '#22c55e'}
                color="rgba(0,0,0,0.3)"
                fillOpacity={0.75}
                weight={1}
              >
                <Tooltip>
                  <div className="text-xs">
                    <div className="font-semibold">{p.zone_name}</div>
                    <div>Predicted: {p.predicted_violation_count.toFixed(0)} violations</div>
                    <div>Risk: {p.risk_level.toUpperCase()}</div>
                    <div>Patrol units: {p.recommended_patrol_count}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Top Forecast Bar Chart */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Predicted Violations by Zone</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={predictions.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis type="category" dataKey="zone_name" tick={{ fill: '#9ca3af', fontSize: 10 }} width={90} />
              <RechartTooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', fontSize: 11 }} />
              <Bar dataKey="predicted_violation_count" radius={[0, 4, 4, 0]} name="Predicted Violations">
                {predictions.slice(0, 8).map((p: Prediction, i: number) => (
                  <Cell key={i} fill={RISK_COLORS[p.risk_level] ?? '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enforcement Recommendations */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <AlertTriangle size={15} className="text-yellow-400" />
          Enforcement Recommendations
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {recommendations.map((r: Record<string, unknown>, i: number) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{r.zone_name as string}</span>
                  <RiskBadge level={r.risk_level as string} />
                </div>
                <p className="text-xs text-gray-400">{r.action as string}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{r.violations_24h as number} violations (24h)</span>
                  <span>Congestion impact: {Number(r.avg_congestion_impact).toFixed(0)}/100</span>
                </div>
              </div>
              <div className="text-center shrink-0">
                <div className="flex items-center gap-1 text-blue-400">
                  <Users size={14} />
                  <span className="text-xl font-bold">{r.patrol_count as number}</span>
                </div>
                <div className="text-xs text-gray-500">patrol units</div>
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p className="text-center text-gray-600 py-4">No recommendations available</p>
          )}
        </div>
      </div>

      {/* Full Predictions Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-400" />
            All Zone Forecasts (Next 24h)
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
              <th className="text-left px-4 py-2.5">Zone</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-right px-4 py-2.5">Predicted</th>
              <th className="text-right px-4 py-2.5">Congestion</th>
              <th className="text-left px-4 py-2.5">Risk</th>
              <th className="text-right px-4 py-2.5">Patrols</th>
              <th className="text-left px-4 py-2.5">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p: Prediction, i: number) => (
              <tr key={i} className="table-row">
                <td className="px-4 py-2.5 text-gray-200">{p.zone_name}</td>
                <td className="px-4 py-2.5 text-gray-400 capitalize">{p.zone_type?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-2.5 text-right text-gray-200">{p.predicted_violation_count.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-right text-gray-300">{p.predicted_congestion_score.toFixed(0)}/100</td>
                <td className="px-4 py-2.5"><RiskBadge level={p.risk_level} /></td>
                <td className="px-4 py-2.5 text-right text-blue-400 font-medium">{p.recommended_patrol_count}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400 max-w-xs truncate">{p.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
