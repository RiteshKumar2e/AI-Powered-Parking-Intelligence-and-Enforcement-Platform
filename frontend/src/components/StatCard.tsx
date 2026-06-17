import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  change?: string
  changePositive?: boolean
  icon: LucideIcon
  color?: 'blue' | 'red' | 'yellow' | 'green' | 'amber'
}

const iconBg = {
  blue:   { background: '#dbeafe', color: '#1d4ed8' },
  red:    { background: '#fee2e2', color: '#dc2626' },
  yellow: { background: 'var(--accent-light)', color: 'var(--accent)' },
  amber:  { background: 'var(--accent-light)', color: 'var(--accent)' },
  green:  { background: 'var(--primary-soft)', color: 'var(--primary)' },
}

export default function StatCard({ title, value, change, changePositive, icon: Icon, color = 'green' }: Props) {
  const ic = iconBg[color] ?? iconBg.green
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{title}</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', margin: '4px 0 0' }}>{value}</p>
          {change && (
            <p style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: 3, color: changePositive ? 'var(--success)' : 'var(--danger)' }}>
              {change}
            </p>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0, marginLeft: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: ic.background, color: ic.color,
        }}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
