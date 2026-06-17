import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Video, AlertTriangle, Map, TrendingUp,
  FileText, Camera, MapPin, Search, Shield, LogOut
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const nav = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/monitor',   icon: Video,           label: 'Live Monitor' },
  { to: '/app/violations',icon: AlertTriangle,   label: 'Violations' },
  { to: '/app/heatmap',   icon: Map,             label: 'Heatmap' },
  { to: '/app/predictions',icon: TrendingUp,     label: 'Predictions' },
  { to: '/app/reports',   icon: FileText,        label: 'Reports' },
  { to: '/app/cameras',   icon: Camera,          label: 'Cameras' },
  { to: '/app/zones',     icon: MapPin,          label: 'Zones' },
  { to: '/app/search',    icon: Search,          label: 'Search' },
]

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside style={{
      width: 232, display: 'flex', flexDirection: 'column', flexShrink: 0,
      background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-light)',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{
          width: 34, height: 34, background: 'var(--primary)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 1px 3px rgba(30,60,10,0.2)',
        }}>
          <Shield size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>ParkIQ</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enforcement Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.625rem', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '0.55rem 0.75rem',
              borderRadius: 10, fontSize: '0.875rem', fontWeight: 600,
              transition: 'var(--transition)', textDecoration: 'none',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              background: isActive ? 'var(--primary)' : 'transparent',
              boxShadow: isActive ? '0 1px 4px rgba(30,60,10,0.18)' : 'none',
            })}
            onMouseEnter={e => {
              if (!(e.currentTarget as HTMLElement).getAttribute('aria-current')) {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-sidebar-hover)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-body)'
              }
            }}
            onMouseLeave={e => {
              const active = (e.currentTarget as HTMLElement).getAttribute('aria-current')
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
              }
            }}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.5rem 0.75rem',
            borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            background: 'none', border: 'none', color: 'var(--text-muted)', transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = 'var(--danger)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <LogOut size={15} /> Sign Out
        </button>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', padding: '0 0.75rem' }}>v1.0.0 · AI-Powered</div>
      </div>
    </aside>
  )
}
