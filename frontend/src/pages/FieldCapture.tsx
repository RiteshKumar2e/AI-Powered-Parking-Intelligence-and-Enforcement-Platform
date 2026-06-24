import { useState, useRef } from 'react'
import { Camera, Search, AlertTriangle, CheckCircle, Zap, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import apiClient from '../api/client'

type PlateCheck = {
  plate: string
  is_watchlisted: boolean
  watchlist?: { reason: string; alert_level: string; notes?: string }
  violation_count: number
  recent_violations: { id: number; type: string; status: string; date: string; fine: number }[]
}

type CaptureResult = {
  violation_id: number
  ticket_number: string
  plate_number: string
  violation_type: string
  fine_amount: number
  is_watchlisted: boolean
  watchlist_reason?: string
  alert_level?: string
}

const VIOLATION_TYPES = [
  { value: 'illegal_parking', label: 'Illegal Parking' },
  { value: 'double_parking', label: 'Double Parking' },
  { value: 'no_parking_zone', label: 'No Parking Zone' },
  { value: 'blocking_intersection', label: 'Blocking Intersection' },
  { value: 'pavement_parking', label: 'Pavement Parking' },
  { value: 'bus_stop_parking', label: 'Bus Stop Parking' },
  { value: 'fire_hydrant_blocking', label: 'Fire Hydrant' },
  { value: 'other', label: 'Other' },
]

const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'truck', label: 'Truck' },
  { value: 'bus', label: 'Bus' },
  { value: 'auto_rickshaw', label: 'Auto' },
]

const ALERT_COLOR: Record<string, string> = {
  critical: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
}

export default function FieldCapture() {
  const [plate, setPlate] = useState('')
  const [violationType, setViolationType] = useState('illegal_parking')
  const [vehicleType, setVehicleType] = useState('car')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [plateCheck, setPlateCheck] = useState<PlateCheck | null>(null)
  const [result, setResult] = useState<CaptureResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (file: File) => {
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const checkPlate = async () => {
    if (!plate.trim()) return
    setChecking(true)
    try {
      const res = await apiClient.get(`/field/plate-check/${plate.trim()}`)
      setPlateCheck(res.data)
    } catch {
      toast.error('Plate lookup failed')
    } finally {
      setChecking(false)
    }
  }

  const handleCapture = async () => {
    if (!plate.trim()) { toast.error('Enter plate number'); return }
    setLoading(true)
    try {
      const form = new FormData()
      form.append('plate_text', plate.trim())
      form.append('violation_type', violationType)
      form.append('vehicle_type', vehicleType)
      if (notes) form.append('notes', notes)
      if (photo) form.append('photo', photo)

      const res = await apiClient.post('/field/quick-capture', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      toast.success(`Ticket ${res.data.ticket_number} issued`)
    } catch {
      toast.error('Failed to issue ticket')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setPlate('')
    setPlateCheck(null)
    setResult(null)
    setPhoto(null)
    setPhotoPreview(null)
    setNotes('')
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 16,
    padding: '1rem',
    marginBottom: 12,
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1rem', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>Field Capture</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick violation · instant ticket</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            {/* Ticket Issued */}
            <div style={{ ...card, borderColor: result.is_watchlisted ? '#FCA5A5' : '#86EFAC', background: result.is_watchlisted ? '#FEF2F2' : '#F0FDF4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                {result.is_watchlisted
                  ? <AlertTriangle size={22} color="#DC2626" />
                  : <CheckCircle size={22} color="#16A34A" />}
                <span style={{ fontWeight: 800, fontSize: '1rem', color: result.is_watchlisted ? '#DC2626' : '#16A34A' }}>
                  {result.is_watchlisted ? 'WATCHLIST HIT — Alert!' : 'Ticket Issued'}
                </span>
              </div>

              {result.is_watchlisted && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '0.6rem 0.8rem', marginBottom: 12, fontSize: '0.8rem', color: '#991B1B', fontWeight: 600 }}>
                  ⚠️ {result.watchlist_reason?.replace('_', ' ').toUpperCase()} — {result.alert_level?.toUpperCase()} ALERT
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Ticket #', result.ticket_number],
                  ['Plate', result.plate_number],
                  ['Type', result.violation_type.replace(/_/g, ' ')],
                  ['Fine', `₹${result.fine_amount}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '0.5rem 0.7rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={reset} className="btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', fontWeight: 700 }}>
              New Capture
            </button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Plate lookup */}
            <div style={card}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                LICENSE PLATE
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  value={plate}
                  onChange={e => { setPlate(e.target.value.toUpperCase()); setPlateCheck(null) }}
                  placeholder="e.g. KA01AB1234"
                  style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  onKeyDown={e => e.key === 'Enter' && checkPlate()}
                />
                <button
                  onClick={checkPlate}
                  disabled={checking || !plate.trim()}
                  style={{ padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
                >
                  <Search size={14} /> {checking ? '...' : 'Check'}
                </button>
              </div>

              <AnimatePresence>
                {plateCheck && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginTop: 10 }}
                  >
                    {plateCheck.is_watchlisted ? (
                      <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10, padding: '0.7rem 0.9rem' }}>
                        <div style={{ fontWeight: 800, color: ALERT_COLOR[plateCheck.watchlist!.alert_level] || '#DC2626', fontSize: '0.85rem', marginBottom: 4 }}>
                          ⚠️ WATCHLISTED — {plateCheck.watchlist!.reason.replace('_', ' ').toUpperCase()}
                        </div>
                        {plateCheck.watchlist!.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#991B1B' }}>{plateCheck.watchlist!.notes}</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                        ✓ Not watchlisted · {plateCheck.violation_count} prior violation(s)
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Violation type */}
            <div style={card}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>VIOLATION TYPE</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {VIOLATION_TYPES.map(vt => (
                  <button
                    key={vt.value}
                    onClick={() => setViolationType(vt.value)}
                    style={{
                      padding: '0.55rem 0.7rem', borderRadius: 9, border: '1.5px solid',
                      borderColor: violationType === vt.value ? 'var(--primary)' : 'var(--border-light)',
                      background: violationType === vt.value ? 'var(--primary-faint)' : 'var(--bg-subtle)',
                      color: violationType === vt.value ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: violationType === vt.value ? 700 : 600,
                      fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                    }}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle type */}
            <div style={card}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>VEHICLE TYPE</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {VEHICLE_TYPES.map(vt => (
                  <button
                    key={vt.value}
                    onClick={() => setVehicleType(vt.value)}
                    style={{
                      padding: '0.45rem 0.8rem', borderRadius: 9999, border: '1.5px solid',
                      borderColor: vehicleType === vt.value ? 'var(--primary)' : 'var(--border-light)',
                      background: vehicleType === vt.value ? 'var(--primary)' : 'transparent',
                      color: vehicleType === vt.value ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div style={card}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>EVIDENCE PHOTO</label>
              {photoPreview ? (
                <div style={{ position: 'relative' }}>
                  <img src={photoPreview} alt="Evidence" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
                  <button onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ width: '100%', padding: '1rem', border: '2px dashed var(--border)', borderRadius: 12, background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                >
                  <Camera size={24} style={{ color: 'var(--text-faint)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tap to take photo</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handlePhotoChange(e.target.files[0]) }} />
            </div>

            {/* Notes */}
            <div style={{ ...card, marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>NOTES (optional)</label>
              <textarea
                className="input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Location details, vehicle description..."
                rows={2}
                style={{ resize: 'none', fontSize: '0.875rem' }}
              />
            </div>

            <motion.button
              onClick={handleCapture}
              disabled={loading || !plate.trim()}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', padding: '0.9rem', borderRadius: 14, border: 'none',
                background: loading || !plate.trim() ? 'var(--border)' : 'var(--primary)',
                color: loading || !plate.trim() ? 'var(--text-faint)' : '#fff',
                fontWeight: 800, fontSize: '1rem', cursor: loading || !plate.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading || !plate.trim() ? 'none' : '0 4px 14px rgba(30,60,10,0.3)',
              }}
            >
              {loading ? (
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
              ) : (
                <><Zap size={18} /> Issue Ticket</>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
