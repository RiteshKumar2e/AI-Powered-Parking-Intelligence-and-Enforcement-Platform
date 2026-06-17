import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Eye, EyeOff, ArrowLeft, UserPlus, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import apiClient from '../api/client'

type Role = 'admin' | 'officer' | 'analyst' | 'viewer'

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'viewer',   label: 'Viewer',   desc: 'Read-only access' },
  { value: 'officer',  label: 'Officer',  desc: 'Upload frames & manage violations' },
  { value: 'analyst',  label: 'Analyst',  desc: 'Reports, predictions & analytics' },
  { value: 'admin',    label: 'Admin',    desc: 'Full system access' },
]

export default function Register() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    username:  '',
    email:     '',
    password:  '',
    confirm:   '',
    role:      'viewer' as Role,
  })
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)

  if (isAuthenticated) { navigate('/app/dashboard', { replace: true }); return null }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const pwdStrength = (): { score: number; label: string; color: string } => {
    const p = form.password
    let score = 0
    if (p.length >= 8)          score++
    if (/[A-Z]/.test(p))        score++
    if (/[0-9]/.test(p))        score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    const map = [
      { label: '',        color: 'transparent' },
      { label: 'Weak',    color: '#EF4444' },
      { label: 'Fair',    color: '#F97316' },
      { label: 'Good',    color: '#EAB308' },
      { label: 'Strong',  color: '#22C55E' },
    ]
    return { score, ...map[score] }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6)        { toast.error('Password must be at least 6 characters'); return }

    setLoading(true)
    try {
      await apiClient.post('/auth/register', {
        full_name: form.full_name,
        username:  form.username,
        email:     form.email,
        password:  form.password,
        role:      form.role,
      })
      setDone(true)
      toast.success('Account created! You can now sign in.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const strength = pwdStrength()

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '1.5rem' }}>
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ textAlign: 'center', maxWidth: 360 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.15 }}
            style={{ width: 72, height: 72, background: '#DCFCE7', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Check size={32} style={{ color: '#16A34A' }} />
          </motion.div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 8px' }}>Account created!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
            Your account <strong>{form.username}</strong> has been registered as <strong>{form.role}</strong>.
          </p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn-primary" style={{ width: '100%', padding: '0.7rem' }} onClick={() => navigate('/login')}>
            Go to Sign In
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-page)', position: 'relative' }}>
      {/* Back to home — top-left */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} style={{ position: 'fixed', top: 16, left: 16, zIndex: 100 }}>
        <Link to="/" style={{
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
      </motion.div>

      {/* Left panel */}
      <div style={{
        width: 400, flexShrink: 0,
        background: 'linear-gradient(160deg, var(--primary) 0%, #1A3A08 100%)',
        padding: '2.5rem', flexDirection: 'column', justifyContent: 'space-between',
        display: 'none',
      }} className="lg:flex lg:flex-col">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>ParkIQ</span>
        </div>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 12 }}>
            Join the ParkIQ<br />Enforcement Network
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Create your account to start monitoring parking violations, running YOLO detection, and enforcing traffic rules with AI.
          </p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLES.map(r => (
              <div key={r.value} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.6rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>{r.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem' }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>© 2025 ParkIQ · AI-Powered Platform</p>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 48 }}>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}
              style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(30,60,10,0.25)', marginBottom: 12 }}>
              <UserPlus size={24} color="#fff" />
            </motion.div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>Create account</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 6 }}>Register to access the enforcement platform</p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Full name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Full Name</label>
                <input className="input" value={form.full_name} onChange={set('full_name')} required placeholder="Ravi Kumar" autoFocus />
              </div>

              {/* Username + Email side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Username</label>
                  <input className="input" value={form.username} onChange={set('username')} required placeholder="ravi_k" autoComplete="username" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Email</label>
                  <input className="input" type="email" value={form.email} onChange={set('email')} required placeholder="ravi@city.gov" />
                </div>
              </div>

              {/* Role */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Role</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')} required placeholder="Min. 6 characters" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Strength bar */}
                {form.password && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border-light)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${strength.score * 25}%`, background: strength.color, borderRadius: 2, transition: 'all 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: strength.color, minWidth: 36 }}>{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={set('confirm')}
                    required
                    placeholder="Repeat password"
                    style={{ paddingRight: 40, borderColor: form.confirm && form.confirm !== form.password ? 'var(--danger)' : undefined }}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex' }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.confirm && form.confirm !== form.password && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '0.65rem 1rem', marginTop: 2 }}
                disabled={loading || (!!form.confirm && form.confirm !== form.password)}
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 16 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
