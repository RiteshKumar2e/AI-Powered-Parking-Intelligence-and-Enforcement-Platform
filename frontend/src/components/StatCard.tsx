import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  change?: string
  changePositive?: boolean
  icon: LucideIcon
  color?: 'blue' | 'red' | 'yellow' | 'green'
}

const colorMap = {
  blue: 'bg-blue-500/10 text-blue-400',
  red: 'bg-red-500/10 text-red-400',
  yellow: 'bg-yellow-500/10 text-yellow-400',
  green: 'bg-green-500/10 text-green-400',
}

export default function StatCard({ title, value, change, changePositive, icon: Icon, color = 'blue' }: Props) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p className={clsx('text-xs mt-1', changePositive ? 'text-green-400' : 'text-red-400')}>
              {change}
            </p>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-lg', colorMap[color])}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
