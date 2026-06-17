import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWebSocket } from '../hooks/useWebSocket'
import { getCameras, ingestFrame, getCurrentCongestion, getCongestionTimeline } from '../api'
import { Upload, Activity, AlertCircle, Wifi, WifiOff, ImageIcon, CheckCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import type { Camera } from '../types'
import { format } from 'date-fns'

const tt = { background: '#fff', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-body)', fontSize: 11 }

type IngestResult = {
  vehicle_count: number
  parked_count: number
  violations_created: number
  congestion_score: number
  annotated_image_url: string | null
  frame_number: number
}

export default function LiveMonitor() {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null)
  const [processing, setProcessing]   = useState(false)
  const [lastResult, setLastResult]   = useState<IngestResult | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [liveEvents, setLiveEvents]   = useState<Record<string, unknown>[]>([])
  const [viewTab, setViewTab]         = useState<'original' | 'annotated'>('annotated')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: cameras }           = useQuery({ queryKey: ['cameras'], queryFn: getCameras })
  const { data: congestionData }    = useQuery({ queryKey: ['congestion-timeline'], queryFn: () => getCongestionTimeline(6, 15), refetchInterval: 60000 })
  const { data: currentCongestion } = useQuery({ queryKey: ['current-congestion'], queryFn: getCurrentCongestion, refetchInterval: 15000 })

  const { connected: wsConnected } = useWebSocket('global', useCallback((msg) => {
    if (msg.type === 'new_violation' || msg.type === 'congestion_update') {
      setLiveEvents(prev => [
        { ...msg.data as Record<string, unknown>, _type: msg.type, _ts: new Date().toISOString() },
        ...prev.slice(0, 19),
      ])
    }
  }, []))

  // Revoke blob URL when it changes or component unmounts
  useEffect(() => {
    return () => { if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const handleUpload = async (file: File) => {
    if (!selectedCamera) { toast.error('Select a camera first'); return }

    setPreviewUrl(URL.createObjectURL(file))
    setLastResult(null)
    setViewTab('original')
    setProcessing(true)

    try {
      const result = await ingestFrame(selectedCamera.id, file) as IngestResult
      setLastResult(result)
      setViewTab('annotated')   // auto-switch to annotated once ready
      if (result.violations_created > 0) {
        toast.error(`${result.violations_created} violation(s) detected!`, { duration: 4000 })
      } else {
        toast.success(`Done — ${result.vehicle_count} vehicle(s) found`)
      }
    } catch {
      toast.error('Frame processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const timeline = congestionData?.timeline ?? []
  const annotatedSrc = lastResult?.annotated_image_url ?? null
  const displaySrc   = viewTab === 'annotated' && annotatedSrc ? annotatedSrc : previewUrl

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fadein">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Live Monitor</h1>
          <p className="section-sub">Upload a frame — YOLO detects vehicles and draws bounding boxes</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem',
          fontWeight: 600, padding: '6px 12px', borderRadius: 9999, border: '1.5px solid',
          background: wsConnected ? '#ECFDF5' : 'var(--bg-subtle)',
          borderColor: wsConnected ? '#6EE7B7' : 'var(--border)',
          color: wsConnected ? '#065F46' : 'var(--text-muted)',
        }}>
          {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {wsConnected ? 'Live Connected' : 'Connecting...'}
        </div>
      </div>

      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* ── Image viewer ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
            {(['original', 'annotated'] as const).map(tab => (
              <button key={tab} onClick={() => setViewTab(tab)} style={{
                flex: 1, padding: '10px 0', fontSize: '0.8rem', fontWeight: 700,
                border: 'none', cursor: 'pointer',
                background: viewTab === tab ? 'var(--primary)' : 'transparent',
                color: viewTab === tab ? '#fff' : 'var(--text-muted)',
                borderBottom: viewTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'var(--transition)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {tab === 'original'
                  ? <><ImageIcon size={12} /> Original</>
                  : <><CheckCircle size={12} /> Detected</>}
              </button>
            ))}
          </div>

          {/* Image area */}
          <div style={{ position: 'relative', background: '#0F172A', minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {displaySrc ? (
              <img
                src={displaySrc}
                alt={viewTab === 'annotated' ? 'Object detection result' : 'Uploaded frame'}
                style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '2rem' }}>
                <ImageIcon size={44} style={{ color: '#334155' }} />
                <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600, margin: 0, textAlign: 'center' }}>
                  Upload a parking frame to run YOLO detection
                </p>
                <p style={{ color: '#475569', fontSize: '0.72rem', margin: 0, textAlign: 'center' }}>
                  Detected vehicles will be boxed in green (moving) or red (parked)
                </p>
              </div>
            )}

            {/* Processing overlay */}
            {processing && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                <Activity size={28} style={{ color: '#fff' }} />
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>Running YOLO detection...</p>
                <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: 0 }}>Detecting vehicles · OCR · Congestion score</p>
              </div>
            )}

            {/* Annotated badge */}
            {!processing && lastResult && viewTab === 'annotated' && annotatedSrc && (
              <div style={{
                position: 'absolute', top: 10, left: 10,
                background: 'rgba(22,163,74,0.9)', color: '#fff',
                fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <CheckCircle size={11} /> YOLO Annotated
              </div>
            )}
          </div>
        </div>

        {/* ── Upload + Stats panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Camera + upload */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', margin: 0 }}>Frame Ingestion</h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Camera
              </label>
              <select className="input" onChange={e => setSelectedCamera(cameras?.find(c => c.id === Number(e.target.value)) ?? null)}>
                <option value="">-- Choose Camera --</option>
                {(cameras ?? []).map((c: Camera) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.location_name})</option>
                ))}
              </select>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '1.25rem', textAlign: 'center', cursor: 'pointer', transition: 'var(--transition)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-faint)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-faint)' }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
              onDrop={e => {
                e.preventDefault()
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'transparent'
                const file = e.dataTransfer.files?.[0]
                if (file) handleUpload(file)
              }}
            >
              <Upload size={22} style={{ color: 'var(--text-faint)', margin: '0 auto 6px' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0 }}>Click or drag image here</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 4 }}>JPG · PNG · JPEG</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />

            {processing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderRadius: 10, padding: '8px 12px' }}>
                <Activity size={13} style={{ animation: 'pulse 1.5s infinite' }} /> Detecting vehicles...
              </div>
            )}
          </div>

          {/* Detection stats */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-body)', marginBottom: 12 }}>
              Detection Results
            </div>
            {lastResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { label: 'Vehicles detected', val: lastResult.vehicle_count,      clr: 'var(--text-body)' },
                  { label: 'Parked vehicles',   val: lastResult.parked_count,       clr: 'var(--accent)' },
                  { label: 'New violations',    val: lastResult.violations_created, clr: lastResult.violations_created > 0 ? 'var(--danger)' : 'var(--success)' },
                  {
                    label: 'Congestion score',
                    val: `${Number(lastResult.congestion_score).toFixed(1)}/100`,
                    clr: lastResult.congestion_score > 70 ? 'var(--danger)' : lastResult.congestion_score > 40 ? 'var(--accent)' : 'var(--success)',
                  },
                ] as { label: string; val: string | number; clr: string }[]).map(({ label, val, clr }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{label}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: clr }}>{val}</span>
                  </div>
                ))}

                {/* Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#00CC44', display: 'inline-block' }} />
                    Moving
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#FF4444', display: 'inline-block' }} />
                    Parked / violation
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
                Upload an image to see results
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Congestion chart */}
      <div className="card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Congestion Score (Last 6h)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="timestamp" tick={{ fill: 'var(--text-faint)', fontSize: 10 }}
              tickFormatter={v => format(new Date(v), 'HH:mm')} />
            <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 10 }} domain={[0, 100]} />
            <Tooltip contentStyle={tt} formatter={(v: number) => [`${v}/100`, 'Congestion']} />
            <Line type="monotone" dataKey="avg_congestion_score" stroke="var(--accent)" strokeWidth={2} dot={false} name="Avg" />
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

      {/* Live event feed */}
      <div className="card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
          Live Event Feed
          <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 9999, border: '1px solid var(--border)' }}>{liveEvents.length}</span>
        </h3>
        {liveEvents.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-faint)', textAlign: 'center', padding: '1.5rem' }}>
            Waiting for live events... Upload frames to begin.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 192, overflowY: 'auto' }}>
            {liveEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, background: ev._type === 'new_violation' ? '#FEE2E2' : 'var(--accent-faint)', color: ev._type === 'new_violation' ? '#B91C1C' : 'var(--accent-hover)' }}>
                  {ev._type === 'new_violation' ? 'VIOLATION' : 'CONGESTION'}
                </span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-faint)', flexShrink: 0 }}>
                  {ev._ts ? format(new Date(ev._ts as string), 'HH:mm:ss') : ''}
                </span>
                <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(JSON.stringify(ev)).slice(0, 80)}...
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
