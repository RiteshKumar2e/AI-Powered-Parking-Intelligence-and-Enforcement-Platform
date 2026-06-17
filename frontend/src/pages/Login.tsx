import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) { navigate('/app/dashboard', { replace: true }); return null }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try { await login(username, password); navigate('/app/dashboard') }
    catch { toast.error('Invalid username or password') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-page)', position: 'relative' }}>
      {/* Back to home — top-left */}
      <Link to="/" style={{
        position: 'fixed', top: 16, left: 16, zIndex: 100,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        padding: '6px 12px', borderRadius: 9999, textDecoration: 'none',
        boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
      }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
      >
        <ArrowLeft size={13} /> Back to home
      </Link>
      {/* Left decorative panel */}
      <div style={{
        width: 400, display: 'none', flexShrink: 0,
        background: 'linear-gradient(160deg, var(--primary) 0%, #1A3A08 100%)',
        padding: '2.5rem', flexDirection: 'column', justifyContent: 'space-between',
      }} className="lg:flex lg:flex-col">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>ParkIQ</span>
        </div>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 12 }}>
            AI-Powered Smart<br />Parking Enforcement
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Detect violations, identify plates, score congestion, and generate enforcement reports — all in real time.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 28 }}>
            {[['14', 'Detection Types'], ['94%+', 'Accuracy'], ['&lt;200ms', 'Processing'], ['Live', 'WebSocket']].map(([v, l]) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }} dangerouslySetInnerHTML={{ __html: v }} />
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>© 2025 ParkIQ · AI-Powered Platform</p>
      </div>

      {/* Right login panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(30,60,10,0.25)', marginBottom: 14 }}>
              <Shield size={26} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>Welcome back</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 6 }}>Sign in to your enforcement account</p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Username</label>
                <input className="input" value={username} onChange={e => setUsername(e.target.value)} autoFocus required placeholder="Enter username" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.65rem 1rem' }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 16 }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Register</Link>
            </p>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Demo credentials</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[['admin','admin123'],['officer1','officer123'],['analyst1','analyst123'],['viewer1','viewer123']].map(([u, p]) => (
                  <button key={u} type="button" onClick={() => { setUsername(u); setPassword(p) }}
                    style={{ textAlign: 'left', padding: '6px 10px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', cursor: 'pointer', transition: 'var(--transition)', fontSize: '0.75rem' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-faint)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{u}</span>
                    <span style={{ color: 'var(--text-faint)' }}> / {p}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
