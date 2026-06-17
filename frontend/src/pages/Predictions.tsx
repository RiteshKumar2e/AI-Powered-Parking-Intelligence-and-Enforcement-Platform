import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { getForecast, getRecommendations } from '../api'
import { RiskBadge } from '../components/ViolationBadge'
import { TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Prediction } from '../types'
import 'leaflet/dist/leaflet.css'

const CENTER: [number, number] = [19.0760, 72.8777]
const RISK_COLORS: Record<string, string> = { low: '#16A34A', medium: '#D97706', high: '#EA580C', critical: '#DC2626' }
const tt = { background: '#fff', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-body)', fontSize: 11 }

export default function Predictions() {
  const { data: forecastData } = useQuery({ queryKey: ['forecast'], queryFn: () => getForecast(24), refetchInterval: 300000 })
  const { data: recData } = useQuery({ queryKey: ['recommendations'], queryFn: getRecommendations, refetchInterval: 300000 })

  const predictions = forecastData?.predictions ?? []
  const recommendations = recData?.recommendations ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fadein">
      <div>
        <h1 className="section-title">Predictive Analytics</h1>
        <p className="section-sub">AI-powered hotspot forecasting and enforcement optimization</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 420 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', margin: 0 }}>Predicted Risk Map (Next 24h)</h3>
          </div>
          <MapContainer center={CENTER} zoom={12} style={{ height: 370 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {predictions.map((p: Prediction, i: number) => (
              <CircleMarker key={i} center={[p.latitude, p.longitude]} radius={8 + p.predicted_violation_count * 0.8}
                fillColor={RISK_COLORS[p.risk_level] ?? '#16A34A'} color="white" fillOpacity={0.8} weight={1}>
                <Tooltip>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{p.zone_name}</div>
                    <div style={{ color: 'var(--text-muted)' }}>Predicted: {p.predicted_violation_count.toFixed(0)} violations</div>
                    <div style={{ color: 'var(--text-muted)' }}>Risk: {p.risk_level.toUpperCase()}</div>
                    <div style={{ color: 'var(--text-muted)' }}>Patrol units: {p.recommended_patrol_count}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Predicted Violations by Zone</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={predictions.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis type="number" tick={{ fill: 'var(--text-faint)', fontSize: 10 }} />
              <YAxis type="category" dataKey="zone_name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={90} />
              <RechartTooltip contentStyle={tt} />
              <Bar dataKey="predicted_violation_count" radius={[0, 4, 4, 0]} name="Predicted Violations">
                {predictions.slice(0, 8).map((p: Prediction, i: number) => (
                  <Cell key={i} fill={RISK_COLORS[p.risk_level] ?? 'var(--primary)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} style={{ color: 'var(--accent)' }} />
          Enforcement Recommendations
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recommendations.map((r: Record<string, unknown>, i: number) => (
            <div key={i} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)' }}>{r.zone_name as string}</span>
                  <RiskBadge level={r.risk_level as string} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.action as string}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                  <span>{r.violations_24h as number} violations (24h)</span>
                  <span>Congestion: {Number(r.avg_congestion_impact).toFixed(0)}/100</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                  <Users size={14} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{r.patrol_count as number}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>patrol units</div>
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '1rem', fontSize: '0.875rem' }}>No recommendations available</p>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', margin: 0 }}>All Zone Forecasts (Next 24h)</h3>
        </div>
        <table style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th className="th">Zone</th><th className="th">Type</th><th className="th" style={{ textAlign: 'right' }}>Predicted</th>
              <th className="th" style={{ textAlign: 'right' }}>Congestion</th><th className="th">Risk</th>
              <th className="th" style={{ textAlign: 'right' }}>Patrols</th><th className="th">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p: Prediction, i: number) => (
              <tr key={i} className="table-row">
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-body)' }}>{p.zone_name}</td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.zone_type?.replace(/_/g, ' ')}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: 'var(--text-body)' }}>{p.predicted_violation_count.toFixed(0)}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>{p.predicted_congestion_score.toFixed(0)}/100</td>
                <td style={{ padding: '0.65rem 1rem' }}><RiskBadge level={p.risk_level} /></td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{p.recommended_patrol_count}</td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
