import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWebSocket } from '../hooks/useWebSocket'
import { getCameras, ingestFrame, getCurrentCongestion, getCongestionTimeline } from '../api'
import { Upload, Activity, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import type { Camera } from '../types'
import { format } from 'date-fns'

const tt = { background: '#fff', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-body)', fontSize: 11 }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fadein">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Live Monitor</h1>
          <p className="section-sub">Real-time feed processing and congestion tracking</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px', borderRadius: 9999, border: '1.5px solid', background: wsConnected ? '#ECFDF5' : 'var(--bg-subtle)', borderColor: wsConnected ? '#6EE7B7' : 'var(--border)', color: wsConnected ? '#065F46' : 'var(--text-muted)' }}>
          {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {wsConnected ? 'Live Connected' : 'Connecting...'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)' }}>Frame Ingestion</h3>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Select Camera</label>
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

          <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'var(--transition)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-faint)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Upload size={24} style={{ color: 'var(--text-faint)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Upload frame image</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>JPG, PNG supported</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />

          {processing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderRadius: 10, padding: '8px 12px' }}>
              <Activity size={14} style={{ animation: 'pulse 1.5s infinite' }} /> Running ML pipeline...
            </div>
          )}

          {lastResult && (
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-body)', marginBottom: 8 }}>Processing Result</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'Vehicles detected', value: lastResult.vehicle_count as number, color: 'var(--text-body)' },
                  { label: 'Parked vehicles', value: lastResult.parked_count as number, color: 'var(--accent)' },
                  { label: 'New violations', value: lastResult.violations_created as number, color: 'var(--danger)' },
                  { label: 'Congestion score', value: `${Number(lastResult.congestion_score).toFixed(1)}/100`, color: '#c45000' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-faint)' }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Congestion Score (Last 6h)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="timestamp" tick={{ fill: 'var(--text-faint)', fontSize: 10 }} tickFormatter={v => format(new Date(v), 'HH:mm')} />
              <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={tt} formatter={(v: number) => [`${v}/100`, 'Congestion']} />
              <Line type="monotone" dataKey="avg_congestion_score" stroke="var(--accent)" strokeWidth={2} dot={false} name="Avg Congestion" />
              <Line type="monotone" dataKey="max_congestion_score" stroke="var(--danger)" strokeWidth={1} strokeDasharray="3 2" dot={false} name="Max" />
            </LineChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-faint)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Camera Congestion</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(currentCongestion?.readings ?? []).slice(0, 8).map((r: Record<string, unknown>, i: number) => (
                <div key={i} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: Number(r.congestion_score) > 70 ? 'var(--danger)' : Number(r.congestion_score) > 40 ? 'var(--accent)' : 'var(--success)' }}>
                    {Number(r.congestion_score).toFixed(0)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Cam {r.camera_id as number}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
          Live Event Feed
          <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 9999, border: '1px solid var(--border)' }}>{liveEvents.length}</span>
        </h3>
        {liveEvents.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-faint)', textAlign: 'center', padding: '1.5rem' }}>Waiting for live events... Upload frames or ingest from cameras.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 192, overflowY: 'auto' }}>
            {liveEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, background: ev._type === 'new_violation' ? '#FEE2E2' : 'var(--accent-faint)', color: ev._type === 'new_violation' ? '#B91C1C' : 'var(--accent-hover)' }}>
                  {ev._type === 'new_violation' ? 'VIOLATION' : 'CONGESTION'}
                </span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-faint)', flexShrink: 0 }}>{ev._ts ? format(new Date(ev._ts as string), 'HH:mm:ss') : ''}</span>
                <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(JSON.stringify(ev)).slice(0, 80)}...</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
