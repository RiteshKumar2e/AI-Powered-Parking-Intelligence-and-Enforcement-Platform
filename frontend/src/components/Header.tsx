import { Bell, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { user } = useAuth()
  return (
    <header style={{
      height: 56, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', flexShrink: 0, boxShadow: 'var(--shadow-nav)',
    }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
        Smart Parking Intelligence &amp; Enforcement
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
          borderRadius: 8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
          transition: 'var(--transition)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Bell size={17} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={13} color="#fff" />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-body)' }}>{user?.username}</span>
          <span style={{
            fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
            background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)', textTransform: 'capitalize',
          }}>
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  )
}
