import type { ViolationStatus } from '../types'

const statusConfig: Record<ViolationStatus, { label: string; cls: string }> = {
  pending_review: { label: 'Pending Review', cls: 'chip-pending' },
  confirmed:      { label: 'Confirmed',      cls: 'chip-confirmed' },
  dismissed:      { label: 'Dismissed',      cls: 'chip-dismissed' },
  ticket_issued:  { label: 'Ticket Issued',  cls: 'chip-issued' },
  appealed:       { label: 'Appealed',       cls: 'chip-appealed' },
  flagged:        { label: 'Flagged',        cls: 'chip-flagged' },
}

export function StatusBadge({ status }: { status: ViolationStatus }) {
  const cfg = statusConfig[status] || statusConfig.pending_review
  return (
    <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
  )
}

const riskConfig = {
  low:      'chip-low',
  medium:   'chip-medium',
  high:     'chip-high',
  critical: 'chip-critical',
}

export function RiskBadge({ level }: { level: string }) {
  const cls = riskConfig[level as keyof typeof riskConfig] || 'chip-low'
  return (
    <span className={`badge capitalize ${cls}`}>{level}</span>
  )
}
