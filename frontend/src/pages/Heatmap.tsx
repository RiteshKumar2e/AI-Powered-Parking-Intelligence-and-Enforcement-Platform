import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { getHeatmap, getHotspots } from '../api'
import 'leaflet/dist/leaflet.css'
import PageWrapper from '../components/PageWrapper'

const SEV_COLORS = ['#2A7B3A','#65A30D','#D97706','#EA580C','#C42020']
const CENTER: [number, number] = [12.9716, 77.5946]  // Bengaluru city centre
const TIME_OPTS = [{ v: 6, l: '6h' },{ v: 12, l: '12h' },{ v: 24, l: '24h' },{ v: 48, l: '2d' },{ v: 168, l: '7d' }]

export default function Heatmap() {
  const [hoursBack, setHoursBack] = useState(24)
  const { data: heatmapData } = useQuery({ queryKey: ['heatmap', hoursBack], queryFn: () => getHeatmap(hoursBack), refetchInterval: 60000 })
  const { data: hotspotData } = useQuery({ queryKey: ['hotspots', hoursBack], queryFn: () => getHotspots(hoursBack), refetchInterval: 60000 })
  const points = heatmapData?.points ?? []
  const hotspots = hotspotData?.hotspots ?? []

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div><h1 className="section-title">Violation Heatmap</h1><p className="section-sub">Spatial distribution of parking violations and congestion hotspots</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 4 }}>Time range:</span>
          {TIME_OPTS.map(({ v, l }) => (
            <button key={v} onClick={() => setHoursBack(v)} style={{ padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)', border: '1.5px solid var(--border-light)', background: hoursBack === v ? 'var(--primary)' : 'var(--bg-card)', color: hoursBack === v ? '#fff' : 'var(--text-secondary)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 520 }}>
          <MapContainer center={CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {points.map((pt, i) => (
              <CircleMarker key={i} center={[pt.lat, pt.lng]} radius={Math.max(8, pt.violation_count * 2)} fillColor={SEV_COLORS[Math.min(pt.severity - 1, 4)]} color="white" weight={1} fillOpacity={0.75}>
                <Tooltip>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>Severity: {pt.severity}/5</div>
                    <div style={{ color: 'var(--text-muted)' }}>Violations: {pt.violation_count}</div>
                    <div style={{ color: 'var(--text-muted)' }}>Congestion: {(pt.intensity * 100).toFixed(0)}%</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="card" style={{ overflowY: 'auto', maxHeight: 520 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Top Hotspots ({hotspots.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
            {['Low','Moderate','High','Very High','Critical'].map((l, i) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: SEV_COLORS[i] }} />{l}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hotspots.slice(0, 15).map((hs: Record<string, unknown>, idx: number) => (
              <div key={idx} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-body)' }}>{(hs.latitude as number).toFixed(4)}, {(hs.longitude as number).toFixed(4)}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: SEV_COLORS[Math.min((hs.severity_level as number) - 1, 4)] }}>Sev {hs.severity_level as number}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{hs.violation_count as number} violations · Avg {Number(hs.avg_congestion_score).toFixed(0)}/100</div>
                {hs.peak_hour != null && <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Peak: {hs.peak_hour as number}:00</div>}
                <div style={{ fontSize: '0.72rem', fontWeight: 600, marginTop: 3, color: hs.trend === 'rising' ? 'var(--danger)' : hs.trend === 'falling' ? 'var(--success)' : 'var(--text-faint)' }}>
                  {hs.trend === 'rising' ? '↑' : hs.trend === 'falling' ? '↓' : '→'} {String(hs.trend ?? 'stable')}
                </div>
              </div>
            ))}
            {!hotspots.length && <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '1rem', fontSize: '0.875rem' }}>No hotspots in selected period</p>}
          </div>
        </div>
      </div>
      </div>
    </PageWrapper>
  )
}

