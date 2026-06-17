import { Link } from 'react-router-dom'
import { Shield, Camera, Map, TrendingUp, FileText, Activity, AlertTriangle, CheckCircle, ArrowRight, Cpu, Zap, Eye, Users, Target, Lightbulb, Mail, Github, Linkedin } from 'lucide-react'

const features = [
  { icon: Camera,    title: 'Computer Vision Detection',  desc: 'YOLOv8-powered real-time vehicle detection with 14 violation types including illegal parking, helmet non-compliance, and stop-line violations.', bg: 'var(--primary-faint)', ic: 'var(--primary)' },
  { icon: Eye,       title: 'License Plate Recognition',  desc: 'OCR-based plate extraction with Indian format validation, confidence scoring, and officer review workflow for seamless enforcement.', bg: 'var(--accent-faint)', ic: 'var(--accent)' },
  { icon: Map,       title: 'Dynamic Heatmaps',           desc: 'Spatial-temporal violation aggregation into interactive heatmaps revealing high-risk zones with severity ranking and trend analysis.', bg: '#e8f8ee', ic: '#16a34a' },
  { icon: TrendingUp,title: 'Predictive Analytics',       desc: 'ML-driven hotspot forecasting using historical patterns to predict future violation concentrations and optimize patrol deployment.', bg: '#e8f0ff', ic: '#2563eb' },
  { icon: FileText,  title: 'AI-Powered Reports',         desc: 'Claude LLM converts raw violation data into structured enforcement reports with actionable insights and zone-level recommendations.', bg: '#f3e8ff', ic: '#7c3aed' },
  { icon: Activity,  title: 'Congestion Scoring',         desc: 'Quantified congestion impact per violation using dwell time, vehicle type, zone priority, and lane-blocking factors (0–100 scale).', bg: '#fff0e8', ic: '#c45000' },
]

const stats = [
  { value: '14',     label: 'Violation Types',       icon: AlertTriangle },
  { value: '<200ms', label: 'Per-frame Processing',  icon: Zap },
  { value: '4 Roles',label: 'RBAC Access Control',   icon: Users },
  { value: 'Live',   label: 'WebSocket Updates',     icon: Activity },
]

const steps = [
  { num: '01', title: 'Ingest',    desc: 'CCTV frames ingested via RTSP stream or manual upload', icon: Camera },
  { num: '02', title: 'Detect',    desc: 'YOLOv8 identifies vehicles and estimates dwell time via tracking', icon: Cpu },
  { num: '03', title: 'Classify',  desc: 'Violation engine matches zone rules and runs OCR on plates', icon: CheckCircle },
  { num: '04', title: 'Enforce',   desc: 'Officers review evidence, issue tickets, AI reports update strategy', icon: Shield },
]

const goals = [
  { icon: Target,    title: 'Our Vision',    desc: 'Build India\'s smartest AI-driven parking enforcement infrastructure — making cities safer, less congested, and easier to manage through real-time intelligence.', bg: 'var(--primary-faint)', ic: 'var(--primary)' },
  { icon: Lightbulb, title: 'Our Mission',   desc: 'Empower traffic authorities with tools that turn raw CCTV footage into actionable enforcement data — reducing violation rates and improving urban mobility.', bg: '#e8f0ff', ic: '#2563eb' },
  { icon: Users,     title: 'For Everyone',  desc: 'Designed for officers on the ground, analysts in the office, and administrators overseeing entire city zones — role-based access ensures the right data reaches the right person.', bg: '#e8f8ee', ic: '#16a34a' },
]

const navLinks = [
  { href: '#home',        label: 'Home' },
  { href: '#features',    label: 'Features' },
  { href: '#goals',       label: 'Our Goals' },
  { href: '#howitworks',  label: 'How It Works' },
  { href: '#tech',        label: 'Technology' },
  { href: '#contact',     label: 'Contact' },
]

const navStyle = (hover = false): React.CSSProperties => ({
  textDecoration: 'none',
  color: hover ? 'var(--text-heading)' : 'var(--text-secondary)',
  fontWeight: 600,
  fontSize: '0.875rem',
  transition: 'color 0.15s',
})

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(253,252,240,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-light)', boxShadow: 'var(--shadow-nav)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', gap: 0 }}>

          {/* Logo — left */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0, marginRight: 'auto' }}>
            <div style={{ width: 36, height: 36, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(30,60,10,0.2)' }}>
              <Shield size={17} color="#fff" />
            </div>
            <div>
              <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1rem' }}>ParkIQ</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 7 }}>Enforcement Platform</span>
            </div>
          </Link>

          {/* Nav links — center */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href}
                style={navStyle()}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >{label}</a>
            ))}
          </div>

          {/* Auth buttons — right */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Link to="/login"    className="btn-secondary" style={{ fontSize: '0.875rem', padding: '0.4rem 0.875rem' }}>Sign In</Link>
            <Link to="/register" className="btn-primary"   style={{ fontSize: '0.875rem', padding: '0.4rem 0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              Sign Up <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section id="home" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -80, left: -80, width: 500, height: 500, borderRadius: '50%', background: 'rgba(200,220,100,0.18)', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', top: 60, right: -60, width: 380, height: 380, borderRadius: '50%', background: 'rgba(200,150,0,0.12)', filter: 'blur(60px)' }} />
        </div>
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '5rem 1.5rem 4rem', textAlign: 'center' }} className="animate-fadein">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--primary-faint)', border: '1px solid var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, padding: '5px 14px', borderRadius: 9999, marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
            AI-Powered Smart City Enforcement
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', fontWeight: 900, color: 'var(--text-heading)', lineHeight: 1.1, marginBottom: 20 }}>
            Smarter Parking.<br />
            <span style={{ background: 'linear-gradient(90deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Safer Cities.
            </span>
          </h1>
          <p style={{ maxWidth: 620, margin: '0 auto 2rem', fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            ParkIQ uses computer vision, license plate recognition, and Claude AI to detect illegal parking, quantify congestion impact, and enable data-driven enforcement in real time.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
            <Link to="/register" className="btn-primary" style={{ padding: '0.75rem 2.25rem', fontSize: '1rem', boxShadow: '0 4px 14px rgba(30,60,10,0.25)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Get Started <ArrowRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 720, margin: '0 auto' }}>
            {stats.map(({ value, label, icon: Icon }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-light)', borderRadius: 16, padding: '1rem', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, background: 'var(--primary-faint)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: 'var(--primary)' }}>
                  <Icon size={17} />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)' }}>{value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 10 }}>Everything You Need for Smart Enforcement</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto' }}>A complete AI pipeline from camera ingestion to actionable reports — built for traffic authorities.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {features.map(({ icon: Icon, title, desc, bg, ic }) => (
            <div key={title} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: ic }}>
                <Icon size={20} />
              </div>
              <h3 style={{ fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>{title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── OUR GOALS / VISION ──────────────────────────────────────────── */}
      <section id="goals" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 10 }}>Our Goals & Vision</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto' }}>Building AI-powered infrastructure for safer, smarter Indian cities — one parking zone at a time.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {goals.map(({ icon: Icon, title, desc, bg, ic }) => (
              <div key={title} style={{ background: 'var(--bg-page)', border: '1px solid var(--border-light)', borderRadius: 16, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ic }}>
                  <Icon size={24} />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-heading)', margin: 0 }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="howitworks" style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 10 }}>How It Works</h2>
          <p style={{ color: 'var(--text-muted)' }}>From CCTV feed to enforcement action in under 5 seconds</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {steps.map(({ num, title, desc, icon: Icon }, i) => (
            <div key={num} style={{ textAlign: 'center', position: 'relative' }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', top: 36, left: 'calc(50% + 36px)', right: 'calc(-50% + 36px)', height: 2, background: 'var(--border-light)', display: 'none' }} />
              )}
              <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--bg-subtle)', border: '2px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--primary)' }}>
                <Icon size={26} />
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-faint)', letterSpacing: '0.12em', marginBottom: 4 }}>{num}</div>
              <h3 style={{ fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>{title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECHNOLOGY ──────────────────────────────────────────────────── */}
      <section id="tech" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 10 }}>Built on Modern AI Stack</h2>
            <p style={{ color: 'var(--text-muted)' }}>Production-grade components for accuracy, speed, and scalability</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {[
              ['YOLOv8',      'Object Detection',    'var(--primary-faint)', 'var(--border-light)'],
              ['EasyOCR',     'License Plate',        'var(--accent-faint)',  'var(--border-light)'],
              ['Claude AI',   'LLM Reporting',        '#f3e8ff',             '#e9d5ff'],
              ['FastAPI',     'REST + WebSocket',     '#e8f0ff',             '#bfdbfe'],
              ['React 18',    'Dashboard UI',         '#e8f8ff',             '#bae6fd'],
              ['Leaflet',     'Interactive Maps',     '#e8f8ee',             '#a7f3d0'],
              ['Recharts',    'Data Visualisation',   '#fff0e8',             '#fddbb0'],
              ['SQLAlchemy',  'ORM + Migrations',     'var(--bg-subtle)',    'var(--border-light)'],
            ].map(([label, sub, bg, border]) => (
              <div key={label} style={{ borderRadius: 12, border: `1px solid ${border}`, padding: '0.875rem', textAlign: 'center', background: bg }}>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────────────────────── */}
      <section id="contact" style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 10 }}>Contact</h2>
          <p style={{ color: 'var(--text-muted)' }}>Have questions or want to collaborate? Reach out.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          {/* Email */}
          <a href="mailto:riteshkumar90359@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16, padding: '1.25rem 1.75rem', textDecoration: 'none', transition: 'var(--transition)', minWidth: 260 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-faint)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Email</div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>riteshkumar90359@gmail.com</div>
            </div>
          </a>

          {/* GitHub */}
          <a href="https://github.com/Riteshkumar2e" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16, padding: '1.25rem 1.75rem', textDecoration: 'none', transition: 'var(--transition)', minWidth: 260 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = '#f6f8fa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f6f8fa', border: '1px solid #e1e4e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#24292f', flexShrink: 0 }}>
              <Github size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>GitHub</div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>Riteshkumar2e</div>
            </div>
          </a>

          {/* LinkedIn */}
          <a href="https://www.linkedin.com/in/riteshkumar-tech/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 16, padding: '1.25rem 1.75rem', textDecoration: 'none', transition: 'var(--transition)', minWidth: 260 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0A66C2'; e.currentTarget.style.background = '#EEF3F8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF3F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A66C2', flexShrink: 0 }}>
              <Linkedin size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>LinkedIn</div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>riteshkumar-tech</div>
            </div>
          </a>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-light)', padding: '1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: 'var(--primary)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={12} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>ParkIQ</span>
            <span>— AI-Powered Smart Parking Intelligence</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[['Sign In','/login'],['Register','/register'],['Dashboard','/app/dashboard'],['API Docs','/api/docs']].map(([l,h]) => (
              <a key={l} href={h} style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >{l}</a>
            ))}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>© 2025 Ritesh Kumar · ParkIQ</div>
        </div>
      </footer>
    </div>
  )
}
