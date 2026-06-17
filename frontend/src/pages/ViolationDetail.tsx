import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, Ticket, MapPin, Clock, Car } from 'lucide-react'
import { getViolation, createEnforcementAction } from '../api'
import { StatusBadge } from '../components/ViolationBadge'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import PageWrapper from '../components/PageWrapper'

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

  if (isLoading) return <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading violation details...</div>
  if (!violation) return <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Violation not found.</div>

  const handleAction = (actionType: string) => {
    actionMutation.mutate({ action_type: actionType, notes: notes || undefined, ticket_number: ticketNum || undefined })
  }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/app/violations" style={{ display: 'flex', color: 'var(--text-muted)', transition: 'var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        ><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="section-title">Violation #{violation.id}</h1>
          <p className="section-sub" style={{ textTransform: 'capitalize' }}>{violation.violation_type?.replace(/_/g, ' ')}</p>
        </div>
        <StatusBadge status={violation.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Evidence Image</h3>
          {violation.annotated_image_url ? (
            <img src={violation.annotated_image_url} alt="Violation evidence"
              style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 256, background: 'var(--bg-subtle)' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div style={{ width: '100%', height: 192, background: 'var(--bg-subtle)', border: '2px dashed var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '0.875rem' }}>
              No image (simulation mode)
            </div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)' }}>Violation Details</h3>
          {[
            { icon: Car, label: 'Vehicle Type', value: violation.vehicle_type },
            { icon: Ticket, label: 'Plate Number', value: violation.plate_number ?? 'Not detected' },
            { icon: MapPin, label: 'Location', value: violation.latitude ? `${violation.latitude.toFixed(4)}, ${violation.longitude?.toFixed(4)}` : 'Unknown' },
            { icon: Clock, label: 'Dwell Time', value: `${Math.round((violation.dwell_seconds ?? 0) / 60)} minutes` },
            { icon: Clock, label: 'Detected At', value: violation.frame_timestamp ? format(new Date(violation.frame_timestamp), 'PPpp') : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Icon size={14} style={{ color: 'var(--text-faint)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{label}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-body)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</div>
              </div>
            </div>
          ))}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Congestion Impact', value: `${violation.congestion_impact_score?.toFixed(1)}/100`, color: '#c45000' },
              { label: 'Fine Amount', value: `₹${violation.fine_amount?.toFixed(0)}`, color: 'var(--text-heading)' },
              { label: 'Detection Confidence', value: `${(violation.detection_confidence * 100).toFixed(0)}%`, color: 'var(--text-secondary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-faint)' }}>{label}</span>
                <span style={{ fontWeight: 600, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 16 }}>Take Enforcement Action</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input className="input" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <input className="input" style={{ width: 176 }} placeholder="Ticket # (optional)" value={ticketNum} onChange={e => setTicketNum(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => handleAction('confirm')} disabled={actionMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB', color: '#fff', padding: '8px 16px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}
          ><CheckCircle size={14} /> Confirm Violation</button>
          <button onClick={() => handleAction('issue_ticket')} disabled={actionMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--success)', color: '#fff', padding: '8px 16px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1E6030'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--success)'}
          ><Ticket size={14} /> Issue Ticket</button>
          <button onClick={() => handleAction('dismiss')} disabled={actionMutation.isPending}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          ><XCircle size={14} /> Dismiss</button>
        </div>
      </div>

      {violation.enforcement_actions && violation.enforcement_actions.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 12 }}>Action History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {violation.enforcement_actions.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: '0.875rem', paddingBottom: 8, borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', flexShrink: 0 }}>{a.action_type}</span>
                <div>
                  <div style={{ color: 'var(--text-body)', fontWeight: 500 }}>{a.officer}</div>
                  {a.notes && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{a.notes}</div>}
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-faint)', flexShrink: 0 }}>{a.timestamp ? format(new Date(a.timestamp), 'MMM d, HH:mm') : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </PageWrapper>
  )
}

