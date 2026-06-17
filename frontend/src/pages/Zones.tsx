import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import { getZones, createZone } from '../api'
import { Plus, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Zone } from '../types'
import 'leaflet/dist/leaflet.css'

const CENTER: [number, number] = [19.0760, 72.8777]

const ZONE_COLORS: Record<string, string> = {
  no_parking: '#ef4444',
  intersection: '#f97316',
  metro_station: '#8b5cf6',
  commercial: '#3b82f6',
  event: '#ec4899',
  restricted: '#f59e0b',
  general: '#6b7280',
}

const ZONE_TYPES = ['no_parking','restricted','metro_station','commercial','event','intersection','general']

export default function Zones() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '', zone_type: 'no_parking', center_lat: '', center_lng: '',
    radius_meters: '100', fine_amount: '500', priority_level: '2', description: '',
  })

  const { data: zones } = useQuery({ queryKey: ['zones'], queryFn: () => getZones() })

  const addMutation = useMutation({
    mutationFn: createZone,
    onSuccess: () => { toast.success('Zone created'); qc.invalidateQueries({ queryKey: ['zones'] }); setShowAdd(false) },
    onError: () => toast.error('Failed to create zone'),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    addMutation.mutate({
      ...form,
      center_lat: parseFloat(form.center_lat),
      center_lng: parseFloat(form.center_lng),
      radius_meters: parseFloat(form.radius_meters),
      fine_amount: parseFloat(form.fine_amount),
      priority_level: parseInt(form.priority_level),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Enforcement Zones</h1>
          <p className="text-sm text-gray-400">{zones?.length ?? 0} zones configured</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Add Zone
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Create Enforcement Zone</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-4 gap-3">
            <input className="input col-span-2" placeholder="Zone Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
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
            <input className="input col-span-3" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={addMutation.isPending}>Create</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        {/* Map */}
        <div className="col-span-3 card p-0 overflow-hidden" style={{ height: 500 }}>
          <MapContainer center={CENTER} zoom={12} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {(zones ?? []).map((z: Zone) => (
              <Circle
                key={z.id}
                center={[z.center_lat, z.center_lng]}
                radius={z.radius_meters}
                pathOptions={{
                  fillColor: ZONE_COLORS[z.zone_type] ?? '#6b7280',
                  fillOpacity: 0.25,
                  color: ZONE_COLORS[z.zone_type] ?? '#6b7280',
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{z.name}</div>
                    <div className="capitalize">{z.zone_type?.replace(/_/g, ' ')}</div>
                    <div>Fine: ₹{z.fine_amount}</div>
                    <div>Priority: {z.priority_level}</div>
                    <div>{z.violation_count} violations</div>
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>

        {/* Zone List */}
        <div className="col-span-2 card overflow-y-auto" style={{ maxHeight: 500 }}>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Zone List</h3>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-1 mb-3">
            {Object.entries(ZONE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {type.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {(zones ?? []).map((z: Zone) => (
              <div key={z.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-200 font-medium">{z.name}</div>
                    <div className="flex items-center gap-1 text-xs capitalize mt-0.5" style={{ color: ZONE_COLORS[z.zone_type] }}>
                      <MapPin size={10} /> {z.zone_type?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">₹{z.fine_amount}</div>
                    <div className={`text-xs ${z.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                      {z.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {z.violation_count} violations · R={z.radius_meters}m · P{z.priority_level}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
