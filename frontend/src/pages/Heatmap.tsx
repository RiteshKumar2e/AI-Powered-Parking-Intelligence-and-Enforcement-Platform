import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet'
import { getHeatmap, getHotspots } from '../api'
import { RiskBadge } from '../components/ViolationBadge'
import 'leaflet/dist/leaflet.css'

const SEVERITY_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444']
const CENTER: [number, number] = [19.0760, 72.8777]

export default function Heatmap() {
  const [hoursBack, setHoursBack] = useState(24)

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap', hoursBack],
    queryFn: () => getHeatmap(hoursBack),
    refetchInterval: 60000,
  })

  const { data: hotspotData } = useQuery({
    queryKey: ['hotspots', hoursBack],
    queryFn: () => getHotspots(hoursBack),
    refetchInterval: 60000,
  })

  const points = heatmapData?.points ?? []
  const hotspots = hotspotData?.hotspots ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Violation Heatmap</h1>
          <p className="text-sm text-gray-400">Spatial distribution of parking violations and congestion hotspots</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Time range:</span>
          {[6, 12, 24, 48, 168].map(h => (
            <button
              key={h}
              onClick={() => setHoursBack(h)}
              className={`px-2 py-1 rounded text-xs font-medium ${hoursBack === h ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {h >= 168 ? '7d' : h >= 48 ? '2d' : `${h}h`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Map */}
        <div className="col-span-2 card p-0 overflow-hidden" style={{ height: 520 }}>
          <MapContainer center={CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {points.map((pt, i) => (
              <CircleMarker
                key={i}
                center={[pt.lat, pt.lng]}
                radius={Math.max(8, pt.violation_count * 2)}
                fillColor={SEVERITY_COLORS[Math.min(pt.severity - 1, 4)]}
                color="transparent"
                fillOpacity={0.6}
              >
                <Tooltip>
                  <div className="text-xs">
                    <div className="font-medium">Severity: {pt.severity}/5</div>
                    <div>Violations: {pt.violation_count}</div>
                    <div>Congestion: {(pt.intensity * 100).toFixed(0)}%</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Hotspot List */}
        <div className="card overflow-y-auto" style={{ maxHeight: 520 }}>
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Top Hotspots ({hotspots.length})
          </h3>
          {/* Legend */}
          <div className="flex flex-wrap gap-1 mb-3">
            {['Low', 'Moderate', 'High', 'Very High', 'Critical'].map((label, i) => (
              <div key={label} className="flex items-center gap-1 text-xs text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: SEVERITY_COLORS[i] }} />
                {label}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {hotspots.slice(0, 15).map((hs: Record<string, unknown>, idx: number) => (
              <div key={idx} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-200">
                    {(hs.latitude as number).toFixed(4)}, {(hs.longitude as number).toFixed(4)}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: SEVERITY_COLORS[Math.min((hs.severity_level as number) - 1, 4)] }}
                  >
                    Sev {hs.severity_level}
                  </span>
                </div>
                <div className="text-xs text-gray-400">{hs.violation_count} violations · Avg congestion {Number(hs.avg_congestion_score).toFixed(0)}</div>
                {hs.peak_hour != null && (
                  <div className="text-xs text-gray-500">Peak hour: {hs.peak_hour}:00</div>
                )}
                <div className={`text-xs mt-1 ${hs.trend === 'rising' ? 'text-red-400' : hs.trend === 'falling' ? 'text-green-400' : 'text-gray-500'}`}>
                  ↑ {hs.trend as string}
                </div>
              </div>
            ))}
            {hotspots.length === 0 && (
              <p className="text-center text-gray-600 py-4 text-sm">No hotspots in selected period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
