import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWebSocket } from '../hooks/useWebSocket'
import { getCameras, ingestFrame, getCurrentCongestion, getCongestionTimeline } from '../api'
import { Upload, Activity, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import type { Camera } from '../types'
import { format } from 'date-fns'

export default function LiveMonitor() {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null)
  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [liveEvents, setLiveEvents] = useState<Record<string, unknown>[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: cameras } = useQuery({ queryKey: ['cameras'], queryFn: getCameras })
  const { data: congestionData } = useQuery({ queryKey: ['congestion-timeline'], queryFn: () => getCongestionTimeline(6, 15), refetchInterval: 60000 })
  const { data: currentCongestion } = useQuery({ queryKey: ['current-congestion'], queryFn: getCurrentCongestion, refetchInterval: 15000 })

  useWebSocket('global', useCallback((msg) => {
    setWsConnected(true)
    if (msg.type === 'new_violation' || msg.type === 'congestion_update') {
      setLiveEvents(prev => [{ ...msg.data as Record<string, unknown>, _type: msg.type, _ts: new Date().toISOString() }, ...prev.slice(0, 19)])
    }
  }, []))

  const handleUpload = async (file: File) => {
    if (!selectedCamera) { toast.error('Select a camera first'); return }
    setProcessing(true)
    try {
      const result = await ingestFrame(selectedCamera.id, file)
      setLastResult(result)
      toast.success(`Processed: ${result.violations_created} violation(s) detected`)
    } catch {
      toast.error('Frame processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const timeline = congestionData?.timeline ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Live Monitor</h1>
          <p className="text-sm text-gray-400">Real-time feed processing and congestion tracking</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? 'text-green-400' : 'text-gray-500'}`}>
          {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {wsConnected ? 'WebSocket Connected' : 'Connecting...'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Frame Upload */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Frame Ingestion</h3>
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Select Camera</label>
            <select className="input" onChange={e => {
              const cam = cameras?.find(c => c.id === Number(e.target.value))
              setSelectedCamera(cam ?? null)
            }}>
              <option value="">-- Choose Camera --</option>
              {(cameras ?? []).map((c: Camera) => (
                <option key={c.id} value={c.id}>{c.name} ({c.location_name})</option>
              ))}
            </select>
          </div>

          <div
            className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} className="text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Upload frame image</p>
            <p className="text-xs text-gray-600 mt-1">JPG, PNG supported</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
          />

          {processing && (
            <div className="mt-3 flex items-center gap-2 text-blue-400 text-sm">
              <Activity size={14} className="animate-pulse" />
              Running ML pipeline...
            </div>
          )}

          {lastResult && (
            <div className="mt-3 bg-gray-800 rounded-lg p-3 text-sm">
              <div className="font-medium text-gray-200 mb-1">Processing Result</div>
              <div className="space-y-0.5 text-xs text-gray-400">
                <div>Vehicles detected: <span className="text-gray-200">{lastResult.vehicle_count as number}</span></div>
                <div>Parked vehicles: <span className="text-yellow-400">{lastResult.parked_count as number}</span></div>
                <div>New violations: <span className="text-red-400">{lastResult.violations_created as number}</span></div>
                <div>Congestion score: <span className="text-orange-400">{Number(lastResult.congestion_score).toFixed(1)}/100</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Congestion Timeline */}
        <div className="card col-span-2">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Congestion Score (Last 6h)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="timestamp" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => format(new Date(v), 'HH:mm')} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', fontSize: 11 }} formatter={(v: number) => [`${v}/100`, 'Congestion']} />
              <Line type="monotone" dataKey="avg_congestion_score" stroke="#f59e0b" strokeWidth={2} dot={false} name="Avg Congestion" />
              <Line type="monotone" dataKey="max_congestion_score" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" dot={false} name="Max" />
            </LineChart>
          </ResponsiveContainer>

          {/* Camera Status Grid */}
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-2">Live Camera Congestion</div>
            <div className="grid grid-cols-4 gap-2">
              {(currentCongestion?.readings ?? []).slice(0, 8).map((r: Record<string, unknown>, i: number) => (
                <div key={i} className="bg-gray-800 rounded p-2 text-center">
                  <div className={`text-lg font-bold ${Number(r.congestion_score) > 70 ? 'text-red-400' : Number(r.congestion_score) > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {Number(r.congestion_score).toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">Cam {r.camera_id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          Live Event Feed
          <span className="bg-gray-700 text-gray-400 text-xs px-1.5 py-0.5 rounded">{liveEvents.length}</span>
        </h3>
        {liveEvents.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">Waiting for live events... Upload frames or ingest from cameras.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {liveEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-800 last:border-0">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ev._type === 'new_violation' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {ev._type === 'new_violation' ? 'VIOLATION' : 'CONGESTION'}
                </span>
                <span className="text-gray-400 font-mono">{ev._ts ? format(new Date(ev._ts as string), 'HH:mm:ss') : ''}</span>
                <span className="text-gray-300 truncate">{JSON.stringify(ev).slice(0, 80)}...</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
