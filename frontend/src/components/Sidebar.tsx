import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Video, AlertTriangle, Map, TrendingUp,
  FileText, Camera, MapPin, Search, Shield
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monitor', icon: Video, label: 'Live Monitor' },
  { to: '/violations', icon: AlertTriangle, label: 'Violations' },
  { to: '/heatmap', icon: Map, label: 'Heatmap' },
  { to: '/predictions', icon: TrendingUp, label: 'Predictions' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/cameras', icon: Camera, label: 'Cameras' },
  { to: '/zones', icon: MapPin, label: 'Zones' },
  { to: '/search', icon: Search, label: 'Search' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-800">
        <Shield className="text-blue-500" size={22} />
        <div>
          <div className="text-sm font-bold text-white">ParkIQ</div>
          <div className="text-xs text-gray-500">Enforcement Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-800">
        <div className="text-xs text-gray-600">v1.0.0 · AI-Powered</div>
      </div>
    </aside>
  )
}
