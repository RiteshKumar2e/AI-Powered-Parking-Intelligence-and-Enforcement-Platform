import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHistory, getCameras, deleteHistoryLog } from '../api'
import { format } from 'date-fns'
import { History as HistoryIcon, Camera, Car, AlertTriangle, Activity, Trash2, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Camera as CameraType } from '../types'

type FrameLogItem = {
  id: number
  camera_id: number | null
  camera_name: string | null
  frame_number: number
  processed_at: string
  vehicle_count: number
  parked_count: number
  violations_created: number
  congestion_score: number
  original_image_url: string | null
  annotated_image_url: string | null
  violation_ids: number[]
}

const LIMIT = 20

export default function History() {
  const [offset, setOffset]         = useState(0)
  const [filterCamera, setFilter]   = useState<number | ''>('')
  const [preview, setPreview]       = useState<{ src: string; label: string } | null>(null)
  const qc = useQueryClient()

  const { data: cameras }  = useQuery({ queryKey: ['cameras'], queryFn: getCameras })
  const { data, isLoading } = useQuery({
    queryKey: ['history', filterCamera, offset],
    queryFn: () => getHistory({ camera_id: filterCamera || undefined, limit: LIMIT, offset }),
  })

  const del = useMutation({
    mutationFn: (id: number) => deleteHistoryLog(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['history'] }); toast.success('Entry deleted') },
    onError:   () => toast.error('Delete failed'),
  })

  const items: FrameLogItem[] = data?.items ?? []
  const total: number         = data?.total ?? 0
  const pages = Math.ceil(total / LIMIT)
  const page  = Math.floor(offset / LIMIT) + 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fadein">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HistoryIcon size={20} style={{ color: 'var(--primary)' }} /> Detection History
          </h1>
          <p className="section-sub">Every frame uploaded and processed by the ML pipeline</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="input"
            style={{ width: 200 }}
            value={filterCamera}
            onChange={e => { setFilter(e.target.value ? Number(e.target.value) : ''); setOffset(0) }}
          >
            <option value="">All Cameras</option>
            {(cameras ?? []).map((c: CameraType) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
            {total} total entries
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)' }}>
            <Activity size={28} style={{ margin: '0 auto 10px', display: 'block' }} />
            Loading history…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-faint)' }}>
            <HistoryIcon size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>No detection history yet</p>
            <p style={{ fontSize: '0.8rem', margin: 0 }}>Upload frames in Live Monitor to start building history</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                  {['Annotated', 'Camera', 'Processed At', 'Vehicles', 'Parked', 'Violations', 'Congestion', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-faint)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)' }}
                  >
                    {/* Thumbnail */}
                    <td style={{ padding: '8px 14px' }}>
                      {item.annotated_image_url ? (
                        <img
                          src={item.annotated_image_url}
                          alt="annotated"
                          onClick={() => setPreview({ src: item.annotated_image_url!, label: `Frame #${item.frame_number} — ${item.camera_name}` })}
                          style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'zoom-in', border: '2px solid var(--border-light)', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: 72, height: 48, borderRadius: 6, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={16} style={{ color: 'var(--text-faint)' }} />
                        </div>
                      )}
                    </td>

                    {/* Camera */}
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Camera size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{item.camera_name ?? `Cam ${item.camera_id}`}</span>
                      </div>
                    </td>

                    {/* Time */}
                    <td style={{ padding: '8px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {item.processed_at ? format(new Date(item.processed_at), 'dd MMM yyyy, HH:mm:ss') : '—'}
                    </td>

                    {/* Vehicles */}
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--text-body)' }}>
                        <Car size={13} style={{ color: 'var(--primary)' }} /> {item.vehicle_count}
                      </span>
                    </td>

                    {/* Parked */}
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--accent)' }}>
                      {item.parked_count}
                    </td>

                    {/* Violations */}
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700,
                        background: item.violations_created > 0 ? '#FEE2E2' : '#DCFCE7',
                        color: item.violations_created > 0 ? '#B91C1C' : '#15803D',
                      }}>
                        {item.violations_created > 0 && <AlertTriangle size={11} />}
                        {item.violations_created}
                      </span>
                    </td>

                    {/* Congestion */}
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden', minWidth: 60 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.min(100, item.congestion_score)}%`,
                            background: item.congestion_score > 70 ? 'var(--danger)' : item.congestion_score > 40 ? 'var(--accent)' : 'var(--success)',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 32 }}>
                          {Number(item.congestion_score).toFixed(0)}
                        </span>
                      </div>
                    </td>

                    {/* Delete */}
                    <td style={{ padding: '8px 14px' }}>
                      <button
                        onClick={() => del.mutate(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = '#FEE2E2' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'none' }}
                        title="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setOffset(o => Math.max(0, o - LIMIT))} disabled={offset === 0}>
            <ChevronLeft size={15} /> Prev
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            Page {page} of {pages}
          </span>
          <button className="btn btn-ghost" onClick={() => setOffset(o => o + LIMIT)} disabled={offset + LIMIT >= total}>
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Image lightbox */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'zoom-out' }}
        >
          <p style={{ color: '#fff', fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{preview.label}</p>
          <img src={preview.src} alt="preview" style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 10, boxShadow: '0 0 40px rgba(0,0,0,0.6)', objectFit: 'contain' }} />
          <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: 10 }}>Click anywhere to close</p>
        </div>
      )}
    </div>
  )
}
