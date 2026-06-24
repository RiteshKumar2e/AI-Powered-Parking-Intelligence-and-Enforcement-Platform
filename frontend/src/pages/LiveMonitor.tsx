import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWebSocket } from '../hooks/useWebSocket'
import { getCameras, ingestFrame, getCurrentCongestion, getCongestionTimeline } from '../api'
import {
  Upload, Activity, AlertCircle, Wifi, WifiOff, ImageIcon, CheckCircle,
  Video, VideoOff, Play, Square, Camera,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import PageWrapper from '../components/PageWrapper'
import type { Camera as CameraType } from '../types'
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
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null)
  const [processing, setProcessing]   = useState(false)
  const [lastResult, setLastResult]   = useState<IngestResult | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [liveEvents, setLiveEvents]   = useState<Record<string, unknown>[]>([])
  const [viewTab, setViewTab]         = useState<'original' | 'annotated'>('annotated')

  // Live webcam mode
  const [isLive, setIsLive]           = useState(false)
  const [frameCount, setFrameCount]   = useState(0)
  const [captureHz, setCaptureHz]     = useState(3)   // seconds between captures
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const processingRef = useRef(false)   // ref to avoid stale closure in interval

  const fileRef = useRef<HTMLInputElement>(null)

  const { data: cameras }           = useQuery({ queryKey: ['cameras'],             queryFn: getCameras })
  const { data: congestionData }    = useQuery({ queryKey: ['congestion-timeline'], queryFn: () => getCongestionTimeline(6, 15), refetchInterval: 60000 })
  const { data: currentCongestion } = useQuery({ queryKey: ['current-congestion'], queryFn: getCurrentCongestion, refetchInterval: 15000 })

  const handleWsMessage = useCallback((msg: { type: string; data: unknown }) => {
    if (msg.type === 'new_violation' || msg.type === 'congestion_update') {
      setLiveEvents(prev => [
        { ...msg.data as Record<string, unknown>, _type: msg.type, _ts: new Date().toISOString() },
        ...prev.slice(0, 19),
      ])
    }
  }, [])
  const { connected: wsConnected } = useWebSocket('global', handleWsMessage)

  // Keep processingRef in sync so interval callback reads fresh value
  useEffect(() => { processingRef.current = processing }, [processing])

  // Revoke blob preview on change
  useEffect(() => {
    return () => { if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── static upload ──────────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (!selectedCamera) { toast.error('Select a camera first'); return }
    setPreviewUrl(URL.createObjectURL(file))
    setLastResult(null)
    setViewTab('original')
    setProcessing(true)
    try {
      const result = await ingestFrame(selectedCamera.id, file) as IngestResult
      setLastResult(result)
      setViewTab('annotated')
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

  // ── live webcam: capture one frame ────────────────────────────────────────
  const captureFrame = useCallback(async () => {
    if (processingRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !selectedCamera) return
    if (video.videoWidth === 0) return                  // not ready yet

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(async (blob) => {
      if (!blob || processingRef.current) return
      processingRef.current = true
      setProcessing(true)
      try {
        const file   = new File([blob], `frame_${Date.now()}.jpg`, { type: 'image/jpeg' })
        const result = await ingestFrame(selectedCamera.id, file) as IngestResult
        setLastResult(result)
        setFrameCount(c => c + 1)
        setViewTab('annotated')
      } catch {
        // silently ignore transient live-mode errors
      } finally {
        processingRef.current = false
        setProcessing(false)
      }
    }, 'image/jpeg', 0.88)
  }, [selectedCamera])

  // ── start webcam ──────────────────────────────────────────────────────────
  const startLive = async () => {
    if (!selectedCamera) { toast.error('Select a camera first'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsLive(true)
      setFrameCount(0)
      setLastResult(null)
      setViewTab('original')
      setPreviewUrl(null)
      intervalRef.current = setInterval(captureFrame, captureHz * 1000)
    } catch {
      toast.error('Camera access denied — check browser permissions')
    }
  }

  // ── stop webcam ───────────────────────────────────────────────────────────
  const stopLive = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsLive(false)
  }

  // Restart interval when captureHz changes
  useEffect(() => {
    if (!isLive) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(captureFrame, captureHz * 1000)
  }, [captureHz, isLive, captureFrame])

  const timeline    = congestionData?.timeline ?? []
  const annotatedSrc = lastResult?.annotated_image_url ?? null
  const displaySrc   = viewTab === 'annotated' && annotatedSrc ? annotatedSrc : previewUrl

  const resultRows = lastResult ? [
    { label: 'Vehicles detected', val: lastResult.vehicle_count,                                clr: 'var(--text-body)' },
    { label: 'Parked vehicles',   val: lastResult.parked_count,                                 clr: 'var(--accent)' },
    { label: 'New violations',    val: lastResult.violations_created,                           clr: lastResult.violations_created > 0 ? 'var(--danger)' : 'var(--success)' },
    { label: 'Congestion score',  val: `${Number(lastResult.congestion_score).toFixed(1)}/100`, clr: lastResult.congestion_score > 70 ? 'var(--danger)' : lastResult.congestion_score > 40 ? 'var(--accent)' : 'var(--success)' },
  ] : []

  return (
    <PageWrapper>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="section-title">Live Monitor</h1>
          <p className="section-sub">Real-time YOLO vehicle detection — upload a frame or use your webcam</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Live badge */}
          {isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, padding: '5px 12px', borderRadius: 9999, background: '#DCFCE7', color: '#15803D', border: '1.5px solid #86EFAC' }}
            >
              <motion.span animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              LIVE · {frameCount} frames
            </motion.div>
          )}
          {/* WS badge */}
          <motion.div
            animate={{ background: wsConnected ? '#ECFDF5' : 'var(--bg-subtle)', borderColor: wsConnected ? '#6EE7B7' : 'var(--border)', color: wsConnected ? '#065F46' : 'var(--text-muted)' }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px', borderRadius: 9999, border: '1.5px solid' }}
          >
            {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {wsConnected ? 'Connected' : 'Connecting...'}
          </motion.div>
        </div>
      </div>

      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* ── Image / Video viewer ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
            {(['original', 'annotated'] as const).map(tab => (
              <button key={tab} onClick={() => setViewTab(tab)} style={{
                flex: 1, padding: '10px 0', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                background: viewTab === tab ? 'var(--primary)' : 'transparent',
                color: viewTab === tab ? '#fff' : 'var(--text-muted)',
                borderBottom: viewTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'background 0.15s, color 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {tab === 'original'
                  ? <><ImageIcon size={12} /> {isLive ? 'Live Feed' : 'Original'}</>
                  : <><CheckCircle size={12} /> Detected</>}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', background: '#0F172A', minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Live video feed (always rendered when live, shown/hidden by tab) */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%', maxHeight: 420, objectFit: 'contain', display: isLive && viewTab === 'original' ? 'block' : 'none',
              }}
            />

            {/* Static image (annotated or preview) */}
            <AnimatePresence mode="wait">
              {(!isLive || viewTab === 'annotated') && (
                displaySrc ? (
                  <motion.img
                    key={displaySrc}
                    src={displaySrc}
                    alt="Detection result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '2rem' }}
                  >
                    {isLive
                      ? <><Video size={44} style={{ color: '#334155' }} /><p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Processing first frame...</p></>
                      : <><ImageIcon size={44} style={{ color: '#334155' }} /><p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600, margin: 0, textAlign: 'center' }}>Upload a frame or start live webcam detection</p></>
                    }
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {/* Processing spinner overlay */}
            <AnimatePresence>
              {processing && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, pointerEvents: 'none' }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                    style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', borderRadius: '50%' }}
                  />
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
                    {isLive ? `Detecting frame #${frameCount + 1}…` : 'Running YOLO detection…'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Annotated badge */}
            <AnimatePresence>
              {!processing && lastResult && viewTab === 'annotated' && annotatedSrc && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.18 }}
                  style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(22,163,74,0.9)', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <CheckCircle size={11} /> YOLO Annotated {isLive && `· frame ${frameCount}`}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Control panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Camera selector */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Camera size={14} /> Frame Ingestion
            </h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Camera</label>
              <select className="input" onChange={e => setSelectedCamera(cameras?.find(c => c.id === Number(e.target.value)) ?? null)} disabled={isLive}>
                <option value="">-- Choose Camera --</option>
                {(cameras ?? []).map((c: CameraType) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.location_name})</option>
                ))}
              </select>
            </div>

            {/* ── Mode tabs ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {/* Upload mode */}
              {!isLive && (
                <motion.div
                  whileHover={{ borderColor: 'var(--primary)', backgroundColor: 'var(--primary-faint)', scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.14 }}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '0.9rem 0.5rem', textAlign: 'center', cursor: 'pointer', gridColumn: '1 / -1' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleUpload(file)
                  }}
                >
                  <Upload size={18} style={{ color: 'var(--text-faint)', margin: '0 auto 5px' }} />
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0 }}>Click or drag image here</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 3 }}>JPG · PNG · JPEG</p>
                </motion.div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
            </div>

            {/* Live webcam controls */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Video size={13} /> Webcam Live Detection
              </div>

              {isLive && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-faint)', marginBottom: 4 }}>
                    <span>Capture every</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{captureHz}s</span>
                  </label>
                  <input type="range" min={1} max={10} step={1} value={captureHz}
                    onChange={e => setCaptureHz(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-faint)' }}>
                    <span>1s (fast)</span><span>10s (slow)</span>
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12 }}
                onClick={isLive ? stopLive : startLive}
                style={{
                  width: '100%', padding: '0.6rem', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: isLive ? '#FEE2E2' : 'var(--primary)',
                  color: isLive ? '#B91C1C' : '#fff',
                  boxShadow: isLive ? 'none' : '0 2px 8px rgba(30,60,10,0.22)',
                }}
              >
                {isLive ? <><Square size={13} /> Stop Live</> : <><Play size={13} /> Start Live Detection</>}
              </motion.button>

              {!isLive && (
                <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 7, lineHeight: 1.5 }}>
                  Opens your webcam and runs YOLO every few seconds. Requires browser camera permission.
                </p>
              )}
            </div>

            <AnimatePresence>
              {processing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderRadius: 10, padding: '8px 12px', overflow: 'hidden' }}
                >
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}>
                    <Activity size={12} />
                  </motion.span>
                  {isLive ? `Detecting frame #${frameCount + 1}...` : 'Detecting vehicles...'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Detection results */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-body)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Detection Results
              {isLive && lastResult && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontWeight: 600 }}>frame {frameCount}</span>
              )}
            </div>
            <AnimatePresence mode="wait">
              {lastResult ? (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  {resultRows.map(({ label, val, clr }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.05 }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 8 }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{label}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: clr }}>{val}</span>
                    </motion.div>
                  ))}
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1A91F0', display: 'inline-block' }} /> Moving
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#FF6B00', display: 'inline-block' }} /> Parked
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ fontSize: '0.8rem', color: 'var(--text-faint)', textAlign: 'center', padding: '1rem 0', margin: 0 }}
                >
                  {isLive ? 'Waiting for first detection...' : 'Upload an image or start live detection'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Congestion chart */}
      <div className="card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Congestion Score (Last 6h)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="timestamp" tick={{ fill: 'var(--text-faint)', fontSize: 10 }} tickFormatter={v => format(new Date(v), 'HH:mm')} />
            <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 10 }} domain={[0, 100]} />
            <Tooltip contentStyle={tt} formatter={(v: number) => [`${v}/100`, 'Congestion']} />
            <Line type="monotone" dataKey="avg_congestion_score" stroke="var(--accent)" strokeWidth={2} dot={false} name="Avg" />
            <Line type="monotone" dataKey="max_congestion_score" stroke="var(--danger)" strokeWidth={1} strokeDasharray="3 2" dot={false} name="Max" />
          </LineChart>
        </ResponsiveContainer>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-faint)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Camera Readings</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {(currentCongestion?.readings ?? []).slice(0, 8).map((r: Record<string, unknown>, i: number) => (
              <motion.div key={i} whileHover={{ scale: 1.05 }} transition={{ duration: 0.12 }}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.5rem', textAlign: 'center', cursor: 'default' }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: Number(r.congestion_score) > 70 ? 'var(--danger)' : Number(r.congestion_score) > 40 ? 'var(--accent)' : 'var(--success)' }}>
                  {Number(r.congestion_score).toFixed(0)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Cam {r.camera_id as number}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Live event feed */}
      <div className="card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
          Live Event Feed
          <motion.span key={liveEvents.length} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 9999, border: '1px solid var(--border)' }}
          >{liveEvents.length}</motion.span>
        </h3>
        {liveEvents.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-faint)', textAlign: 'center', padding: '1.5rem' }}>
            Waiting for live events...
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 192, overflowY: 'auto' }}>
            <AnimatePresence initial={false}>
              {liveEvents.map((ev, i) => (
                <motion.div key={`${ev._ts}-${i}`}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}
                >
                  <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, background: ev._type === 'new_violation' ? '#FEE2E2' : 'var(--accent-faint)', color: ev._type === 'new_violation' ? '#B91C1C' : 'var(--accent-hover)' }}>
                    {ev._type === 'new_violation' ? 'VIOLATION' : 'CONGESTION'}
                  </span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-faint)', flexShrink: 0 }}>
                    {ev._ts ? format(new Date(ev._ts as string), 'HH:mm:ss') : ''}
                  </span>
                  <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {String(JSON.stringify(ev)).slice(0, 80)}...
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
