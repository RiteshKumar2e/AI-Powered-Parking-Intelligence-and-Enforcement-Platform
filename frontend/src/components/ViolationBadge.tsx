import clsx from 'clsx'
import type { ViolationStatus } from '../types'

const statusConfig: Record<ViolationStatus, { label: string; cls: string }> = {
  pending_review: { label: 'Pending Review', cls: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' },
  dismissed: { label: 'Dismissed', cls: 'bg-gray-500/10 text-gray-400 border border-gray-500/30' },
  ticket_issued: { label: 'Ticket Issued', cls: 'bg-green-500/10 text-green-400 border border-green-500/30' },
  appealed: { label: 'Appealed', cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' },
}

export function StatusBadge({ status }: { status: ViolationStatus }) {
  const cfg = statusConfig[status] || statusConfig.pending_review
  return (
    <span className={clsx('badge text-xs px-2 py-0.5 rounded-full', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

const riskConfig = {
  low: 'bg-green-500/10 text-green-400',
  medium: 'bg-yellow-500/10 text-yellow-400',
  high: 'bg-orange-500/10 text-orange-400',
  critical: 'bg-red-500/10 text-red-400',
}

export function RiskBadge({ level }: { level: string }) {
  const cls = riskConfig[level as keyof typeof riskConfig] || riskConfig.low
  return (
    <span className={clsx('badge capitalize font-semibold', cls)}>
      {level}
    </span>
  )
}
