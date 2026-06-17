import { motion } from 'framer-motion'
import CountUp from 'react-countup'
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

function AnimatedValue({ value }: { value: string | number }) {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!isNaN(num) && String(value) === String(num)) {
    return (
      <CountUp
        end={num}
        duration={1.4}
        useEasing
        separator=","
        decimals={Number.isInteger(num) ? 0 : 1}
      />
    )
  }
  // e.g. "3/5", "High", "—"
  const match = String(value).match(/^(\d+)(\D+.*)$/)
  if (match) {
    return <><CountUp end={parseInt(match[1])} duration={1.2} />{match[2]}</>
  }
  return <>{value}</>
}

export default function StatCard({ title, value, change, changePositive, icon: Icon, color = 'green' }: Props) {
  const ic = iconBg[color] ?? iconBg.green
  return (
    <motion.div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 2, cursor: 'default' }}
      whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(30,60,10,0.10)' }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{title}</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', margin: '4px 0 0' }}>
            <AnimatedValue value={value} />
          </p>
          {change && (
            <p style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: 3, color: changePositive ? 'var(--success)' : 'var(--danger)' }}>
              {change}
            </p>
          )}
        </div>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.15 }}
          style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0, marginLeft: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: ic.background, color: ic.color,
          }}
        >
          <Icon size={20} />
        </motion.div>
      </div>
    </motion.div>
  )
}
