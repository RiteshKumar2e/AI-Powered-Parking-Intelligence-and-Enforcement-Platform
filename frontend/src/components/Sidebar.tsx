import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Video, AlertTriangle, Map, TrendingUp,
  FileText, Camera, MapPin, Search, Shield, LogOut
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'

type NavItem = {
  to: string
  icon: React.ElementType
  label: string
  roles: UserRole[]
}

const nav: NavItem[] = [
  { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    roles: ['admin', 'officer', 'analyst', 'viewer'] },
  { to: '/app/monitor',      icon: Video,           label: 'Live Monitor', roles: ['admin', 'officer'] },
  { to: '/app/violations',   icon: AlertTriangle,   label: 'Violations',   roles: ['admin', 'officer', 'analyst', 'viewer'] },
  { to: '/app/heatmap',      icon: Map,             label: 'Heatmap',      roles: ['admin', 'officer', 'analyst', 'viewer'] },
  { to: '/app/predictions',  icon: TrendingUp,      label: 'Predictions',  roles: ['admin', 'analyst'] },
  { to: '/app/reports',      icon: FileText,        label: 'Reports',      roles: ['admin', 'analyst'] },
  { to: '/app/cameras',      icon: Camera,          label: 'Cameras',      roles: ['admin', 'officer'] },
  { to: '/app/zones',        icon: MapPin,          label: 'Zones',        roles: ['admin', 'analyst', 'viewer'] },
  { to: '/app/search',       icon: Search,          label: 'Search',       roles: ['admin', 'officer', 'analyst', 'viewer'] },
]

const ROLE_BADGE: Record<UserRole, { label: string; bg: string; color: string }> = {
  admin:    { label: 'Admin',    bg: '#FEF3C7', color: '#92400E' },
  officer:  { label: 'Officer',  bg: '#DBEAFE', color: '#1E40AF' },
  analyst:  { label: 'Analyst',  bg: '#D1FAE5', color: '#065F46' },
  viewer:   { label: 'Viewer',   bg: '#F3F4F6', color: '#4B5563' },
}

export default function Sidebar() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  const role = (user?.role ?? 'viewer') as UserRole
  const visibleNav = nav.filter(item => item.roles.includes(role))
  const badge = ROLE_BADGE[role]

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

      {/* User role chip */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1.25rem',
          borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>
              {(user.full_name || user.username || '?')[0].toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name || user.username}
            </div>
            <span style={{
              display: 'inline-block', fontSize: '0.65rem', fontWeight: 700,
              padding: '1px 6px', borderRadius: 99,
              background: badge.bg, color: badge.color,
            }}>
              {badge.label}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.625rem', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleNav.map(({ to, icon: Icon, label }) => (
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
