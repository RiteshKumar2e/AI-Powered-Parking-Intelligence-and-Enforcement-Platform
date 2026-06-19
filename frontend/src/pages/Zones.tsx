import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import { getZones, createZone } from '../api'
import { Plus, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Zone } from '../types'
import 'leaflet/dist/leaflet.css'
import PageWrapper from '../components/PageWrapper'

const CENTER: [number, number] = [12.9716, 77.5946]  // Bengaluru city centre
const ZONE_COLORS: Record<string, string> = {
  no_parking:    '#DC2626',
  intersection:  '#EA580C',
  metro_station: '#7C3AED',
  commercial:    '#2563EB',
  event:         '#DB2777',
  restricted:    '#D97706',
  general:       '#6B7280',
}
const ZONE_TYPES = ['no_parking','restricted','metro_station','commercial','event','intersection','general']

export default function Zones() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', zone_type: 'no_parking', center_lat: '', center_lng: '', radius_meters: '100', fine_amount: '500', priority_level: '2', description: '' })

  const { data: zones } = useQuery({ queryKey: ['zones'], queryFn: () => getZones() })

  const addMutation = useMutation({
    mutationFn: createZone,
    onSuccess: () => { toast.success('Zone created'); qc.invalidateQueries({ queryKey: ['zones'] }); setShowAdd(false) },
    onError: () => toast.error('Failed to create zone'),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    addMutation.mutate({ ...form, center_lat: parseFloat(form.center_lat), center_lng: parseFloat(form.center_lng), radius_meters: parseFloat(form.radius_meters), fine_amount: parseFloat(form.fine_amount), priority_level: parseInt(form.priority_level) })
  }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Enforcement Zones</h1>
          <p className="section-sub">{zones?.length ?? 0} zones configured</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Zone
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Create Enforcement Zone</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <input className="input" style={{ gridColumn: 'span 2' }} placeholder="Zone Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <select className="input" value={form.zone_type} onChange={e => setForm(f => ({ ...f, zone_type: e.target.value }))}>
              {ZONE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select className="input" value={form.priority_level} onChange={e => setForm(f => ({ ...f, priority_level: e.target.value }))}>
              <option value="1">Priority 1 (Low)</option>
              <option value="2">Priority 2 (Medium)</option>
              <option value="3">Priority 3 (High)</option>
              <option value="4">Priority 4 (Critical)</option>
            </select>
            <input className="input" placeholder="Center Latitude" type="number" step="any" value={form.center_lat} onChange={e => setForm(f => ({ ...f, center_lat: e.target.value }))} required />
            <input className="input" placeholder="Center Longitude" type="number" step="any" value={form.center_lng} onChange={e => setForm(f => ({ ...f, center_lng: e.target.value }))} required />
            <input className="input" placeholder="Radius (meters)" type="number" value={form.radius_meters} onChange={e => setForm(f => ({ ...f, radius_meters: e.target.value }))} />
            <input className="input" placeholder="Fine Amount (₹)" type="number" value={form.fine_amount} onChange={e => setForm(f => ({ ...f, fine_amount: e.target.value }))} />
            <input className="input" style={{ gridColumn: 'span 3' }} placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={addMutation.isPending}>Create</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 500 }}>
          <MapContainer center={CENTER} zoom={12} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {(zones ?? []).map((z: Zone) => (
              <Circle key={z.id} center={[z.center_lat, z.center_lng]} radius={z.radius_meters}
                pathOptions={{ fillColor: ZONE_COLORS[z.zone_type] ?? '#6B7280', fillOpacity: 0.2, color: ZONE_COLORS[z.zone_type] ?? '#6B7280', weight: 2 }}>
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{z.name}</div>
                    <div style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{z.zone_type?.replace(/_/g, ' ')}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Fine: ₹{z.fine_amount}</div>
                    <div style={{ color: 'var(--text-faint)' }}>Priority: {z.priority_level}</div>
                    <div style={{ color: 'var(--text-faint)' }}>{z.violation_count} violations</div>
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>

        <div className="card" style={{ overflowY: 'auto', maxHeight: 500 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Zone List</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
            {Object.entries(ZONE_COLORS).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {type.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(zones ?? []).map((z: Zone) => (
              <div key={z.id} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)' }}>{z.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', textTransform: 'capitalize', fontWeight: 600, marginTop: 2, color: ZONE_COLORS[z.zone_type] }}>
                      <MapPin size={10} /> {z.zone_type?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>₹{z.fine_amount}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: z.is_active ? 'var(--success)' : 'var(--text-faint)' }}>{z.is_active ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                  {z.violation_count} violations · R={z.radius_meters}m · P{z.priority_level}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

