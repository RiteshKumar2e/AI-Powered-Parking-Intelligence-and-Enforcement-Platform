import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { getCameras, createCamera, updateCamera } from '../api'
import { Plus, Camera as CameraIcon, Activity, AlertCircle, Wifi } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Camera } from '../types'
import 'leaflet/dist/leaflet.css'

const CENTER: [number, number] = [19.0760, 72.8777]
const STATUS_COLORS = { active: '#22c55e', inactive: '#6b7280', maintenance: '#f59e0b', error: '#ef4444' }

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
    addMutation.mutate({
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    })
  }

  const active = cameras?.filter(c => c.status === 'active').length ?? 0
  const total = cameras?.length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Camera Management</h1>
          <p className="text-sm text-gray-400">{active}/{total} cameras active</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Add Camera
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Add New Camera</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-3 gap-3">
            <input className="input" placeholder="Camera Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="input" placeholder="Location Name" value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} required />
            <input className="input" placeholder="RTSP URL (optional)" value={form.rtsp_url} onChange={e => setForm(f => ({ ...f, rtsp_url: e.target.value }))} />
            <input className="input" placeholder="Latitude" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} required type="number" step="any" />
            <input className="input" placeholder="Longitude" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} required type="number" step="any" />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Adding...' : 'Add Camera'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Map */}
        <div className="card p-0 overflow-hidden" style={{ height: 420 }}>
          <MapContainer center={CENTER} zoom={12} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {(cameras ?? []).map((c: Camera) => (
              <CircleMarker
                key={c.id}
                center={[c.latitude, c.longitude]}
                radius={8}
                fillColor={STATUS_COLORS[c.status] ?? '#6b7280'}
                color="rgba(0,0,0,0.3)"
                fillOpacity={0.9}
                weight={1}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{c.name}</div>
                    <div>{c.location_name}</div>
                    <div className="capitalize">{c.status}</div>
                    <div>{c.violation_count} violations</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden" style={{ maxHeight: 420 }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
                <th className="text-left px-4 py-2.5">Camera</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Violations</th>
                <th className="text-left px-4 py-2.5">Last Active</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(cameras ?? []).map((c: Camera) => (
                <tr key={c.id} className="table-row">
                  <td className="px-4 py-2.5">
                    <div className="text-gray-200 text-sm">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.location_name}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-xs capitalize" style={{ color: STATUS_COLORS[c.status] }}>
                      <Wifi size={11} /> {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-300">{c.violation_count}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {c.last_active ? format(new Date(c.last_active), 'MMM d HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleMutation.mutate({ id: c.id, status: c.status === 'active' ? 'inactive' : 'active' })}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      {c.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
