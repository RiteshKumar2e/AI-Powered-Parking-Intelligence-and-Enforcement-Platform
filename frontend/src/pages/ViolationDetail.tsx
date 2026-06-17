import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, Ticket, MapPin, Clock, Car } from 'lucide-react'
import { getViolation, createEnforcementAction } from '../api'
import { StatusBadge } from '../components/ViolationBadge'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function ViolationDetail() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const [ticketNum, setTicketNum] = useState('')

  const { data: violation, isLoading } = useQuery({
    queryKey: ['violation', id],
    queryFn: () => getViolation(Number(id)),
    enabled: !!id,
  })

  const actionMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createEnforcementAction(Number(id), data),
    onSuccess: (_, vars) => {
      toast.success(`Action recorded: ${vars.action_type}`)
      qc.invalidateQueries({ queryKey: ['violation', id] })
    },
    onError: () => toast.error('Failed to record action'),
  })

  if (isLoading) return <div className="text-gray-400 p-8">Loading violation details...</div>
  if (!violation) return <div className="text-gray-400 p-8">Violation not found.</div>

  const handleAction = (actionType: string) => {
    actionMutation.mutate({
      action_type: actionType,
      notes: notes || undefined,
      ticket_number: ticketNum || undefined,
    })
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/violations" className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Violation #{violation.id}</h1>
          <p className="text-sm text-gray-400 capitalize">{violation.violation_type?.replace(/_/g, ' ')}</p>
        </div>
        <StatusBadge status={violation.status} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Evidence Image */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Evidence Image</h3>
          {violation.annotated_image_url ? (
            <img
              src={violation.annotated_image_url}
              alt="Violation evidence"
              className="w-full rounded-lg object-cover max-h-64 bg-gray-800"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-48 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm">
              No image available (simulation mode)
            </div>
          )}
        </div>

        {/* Details */}
        <div className="card space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Violation Details</h3>
          {[
            { icon: Car, label: 'Vehicle Type', value: violation.vehicle_type },
            { icon: Ticket, label: 'Plate Number', value: violation.plate_number ?? 'Not detected' },
            { icon: MapPin, label: 'Location', value: violation.latitude ? `${violation.latitude.toFixed(4)}, ${violation.longitude?.toFixed(4)}` : 'Unknown' },
            { icon: Clock, label: 'Dwell Time', value: `${Math.round((violation.dwell_seconds ?? 0) / 60)} minutes` },
            { icon: Clock, label: 'Detected At', value: violation.frame_timestamp ? format(new Date(violation.frame_timestamp), 'PPpp') : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon size={14} className="text-gray-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-sm text-gray-200 capitalize">{value}</div>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-800">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Congestion Impact</span>
              <span className="font-medium text-orange-400">{violation.congestion_impact_score?.toFixed(1)}/100</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Fine Amount</span>
              <span className="font-medium text-white">₹{violation.fine_amount?.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Detection Confidence</span>
              <span className="font-medium text-gray-200">{(violation.detection_confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enforcement Actions */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Take Enforcement Action</h3>
        <div className="flex gap-3 mb-3">
          <input
            className="input"
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <input
            className="input w-40"
            placeholder="Ticket # (optional)"
            value={ticketNum}
            onChange={e => setTicketNum(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleAction('confirm')}
            disabled={actionMutation.isPending}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            <CheckCircle size={14} /> Confirm Violation
          </button>
          <button
            onClick={() => handleAction('issue_ticket')}
            disabled={actionMutation.isPending}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            <Ticket size={14} /> Issue Ticket
          </button>
          <button
            onClick={() => handleAction('dismiss')}
            disabled={actionMutation.isPending}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            <XCircle size={14} /> Dismiss
          </button>
        </div>
      </div>

      {/* Action History */}
      {violation.enforcement_actions && violation.enforcement_actions.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Action History</h3>
          <div className="space-y-2">
            {violation.enforcement_actions.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm py-2 border-b border-gray-800 last:border-0">
                <div className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs capitalize">{a.action_type}</div>
                <div>
                  <div className="text-gray-200">{a.officer}</div>
                  {a.notes && <div className="text-gray-500 text-xs">{a.notes}</div>}
                </div>
                <div className="ml-auto text-xs text-gray-500">{a.timestamp ? format(new Date(a.timestamp), 'MMM d, HH:mm') : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
