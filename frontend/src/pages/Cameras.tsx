import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { getCameras, createCamera, updateCamera } from '../api'
import { Plus, Wifi } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Camera } from '../types'
import 'leaflet/dist/leaflet.css'
import PageWrapper from '../components/PageWrapper'

const CENTER: [number, number] = [12.9716, 77.5946]  // Bengaluru city centre
const STATUS_COLORS: Record<string, string> = {
  active:      '#16A34A',
  inactive:    '#9CA3AF',
  maintenance: '#D97706',
  error:       '#DC2626',
}

export default function Cameras() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', location_name: '', latitude: '', longitude: '', rtsp_url: '' })

  const { data: cameras } = useQuery({ queryKey: ['cameras'], queryFn: getCameras, refetchInterval: 30000 })

  const addMutation = useMutation({
    mutationFn: createCamera,
    onSuccess: () => { toast.success('Camera added'); qc.invalidateQueries({ queryKey: ['cameras'] }); setShowAdd(false) },
    onError: () => toast.error('Failed to add camera'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateCamera(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cameras'] }),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    addMutation.mutate({ ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) })
  }

  const active = cameras?.filter(c => c.status === 'active').length ?? 0
  const total = cameras?.length ?? 0

  return (
    <PageWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Camera Management</h1>
          <p className="section-sub">{active}/{total} cameras active</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Camera
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Add New Camera</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <input className="input" placeholder="Camera Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="input" placeholder="Location Name" value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} required />
            <input className="input" placeholder="RTSP URL (optional)" value={form.rtsp_url} onChange={e => setForm(f => ({ ...f, rtsp_url: e.target.value }))} />
            <input className="input" placeholder="Latitude" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} required type="number" step="any" />
            <input className="input" placeholder="Longitude" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} required type="number" step="any" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={addMutation.isPending}>{addMutation.isPending ? 'Adding...' : 'Add Camera'}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 420 }}>
          <MapContainer center={CENTER} zoom={12} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {(cameras ?? []).map((c: Camera) => (
              <CircleMarker key={c.id} center={[c.latitude, c.longitude]} radius={9}
                fillColor={STATUS_COLORS[c.status] ?? '#9CA3AF'} color="white" weight={1.5} fillOpacity={0.9}>
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{c.name}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{c.location_name}</div>
                    <div style={{ textTransform: 'capitalize', color: 'var(--text-faint)' }}>{c.status}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{c.violation_count} violations</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                <th className="th">Camera</th>
                <th className="th">Status</th>
                <th className="th" style={{ textAlign: 'right' }}>Violations</th>
                <th className="th">Last Active</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {(cameras ?? []).map((c: Camera) => (
                <tr key={c.id} className="table-row">
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-body)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{c.location_name}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', color: STATUS_COLORS[c.status] }}>
                      <Wifi size={11} /> {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{c.violation_count}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                    {c.last_active ? format(new Date(c.last_active), 'MMM d HH:mm') : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button onClick={() => toggleMutation.mutate({ id: c.id, status: c.status === 'active' ? 'inactive' : 'active' })}
                      style={{ fontSize: '0.75rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'var(--transition)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >{c.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}

