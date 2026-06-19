import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, type Variants } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import CountUp from 'react-countup'
import {
  Shield, Camera, Map, TrendingUp, FileText, Activity,
  AlertTriangle, CheckCircle, ArrowRight, Cpu, Zap, Eye,
  Users, Target, Lightbulb, Mail, Github, Linkedin, X,
  LayoutDashboard, Video, BarChart2, Layers, ChevronUp,
} from 'lucide-react'

// ── animation variants ────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}
const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}
const stagger = (delay = 0.1): Variants => ({
  visible: { transition: { staggerChildren: delay } },
})

// ── scroll-triggered section wrapper ─────────────────────────────────────
function Section({ children, style = {}, id = '' }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  return (
    <motion.section
      id={id} ref={ref}
      initial="hidden" animate={inView ? 'visible' : 'hidden'}
      variants={stagger()}
      style={style}
    >
      {children}
    </motion.section>
  )
}

// ── animated stat card ────────────────────────────────────────────────────
function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: React.ElementType }) {
  const [ref, inView] = useInView({ triggerOnce: true })
  const isNum = /^\d+/.test(value)
  const num   = parseInt(value.replace(/\D/g, ''), 10) || 0
  return (
    <motion.div variants={fadeUp} ref={ref}
      whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(30,60,10,0.13)' }}
      style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-light)', borderRadius: 18, padding: '1.1rem', textAlign: 'center', cursor: 'default' }}
    >
      <div style={{ width: 38, height: 38, background: 'var(--primary-faint)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--primary)' }}>
        <Icon size={17} />
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-heading)', lineHeight: 1 }}>
        {isNum && inView
          ? <CountUp end={num} duration={2} suffix={value.replace(/[\d]/g, '')} />
          : value}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{label}</div>
    </motion.div>
  )
}

// ── feature card ──────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, bg, ic }: { icon: React.ElementType; title: string; desc: string; bg: string; ic: string }) {
  return (
    <motion.div variants={fadeUp}
      whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(30,60,10,0.12)' }}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'default', transition: 'box-shadow 0.2s' }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: ic }}>
        <Icon size={22} />
      </div>
      <h3 style={{ fontWeight: 800, color: 'var(--text-heading)', margin: 0, fontSize: '1rem' }}>{title}</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>{desc}</p>
    </motion.div>
  )
}

// ── contact card ──────────────────────────────────────────────────────────
function ContactCard({ href, icon: Icon, label, value, hoverBorder, hoverBg, iconBg, iconColor }: {
  href: string; icon: React.ElementType; label: string; value: string;
  hoverBorder: string; hoverBg: string; iconBg: string; iconColor: string;
}) {
  return (
    <motion.a href={href} target="_blank" rel="noopener noreferrer" variants={fadeUp}
      whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}
      style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 18, padding: '1.4rem 1.8rem', textDecoration: 'none', minWidth: 260 }}
    >
      <motion.div whileHover={{ rotate: 10, scale: 1.1 }} style={{ width: 48, height: 48, borderRadius: 14, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, flexShrink: 0 }}>
        <Icon size={22} />
      </motion.div>
      <div>
        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
        <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{value}</div>
      </div>
    </motion.a>
  )
}

// ── data ──────────────────────────────────────────────────────────────────
const features = [
  { icon: Camera,    title: 'Computer Vision Detection', desc: 'YOLOv8-powered real-time vehicle detection with 14 violation types including illegal parking and stop-line violations.', bg: 'var(--primary-faint)', ic: 'var(--primary)' },
  { icon: Eye,       title: 'License Plate Recognition', desc: 'OCR-based plate extraction with Indian format validation, confidence scoring, and officer review workflow.', bg: 'var(--accent-faint)', ic: 'var(--accent)' },
  { icon: Map,       title: 'Dynamic Heatmaps',          desc: 'Spatial-temporal violation aggregation into interactive heatmaps revealing high-risk zones and trend analysis.', bg: '#e8f8ee', ic: '#16a34a' },
  { icon: TrendingUp,title: 'Predictive Analytics',      desc: 'ML-driven hotspot forecasting using historical patterns to predict future violations and optimize patrol deployment.', bg: '#e8f0ff', ic: '#2563eb' },
  { icon: FileText,  title: 'AI-Powered Reports',        desc: 'Groq LLM (Llama 3.3) converts raw violation data into structured enforcement reports with actionable zone-level insights.', bg: '#f3e8ff', ic: '#7c3aed' },
  { icon: Activity,  title: 'Congestion Scoring',        desc: 'Quantified congestion impact per violation using dwell time, vehicle type, zone priority, and lane-blocking (0–100).', bg: '#fff0e8', ic: '#c45000' },
]

const stats = [
  { value: '14',     label: 'Violation Types',      icon: AlertTriangle },
  { value: '200',    label: 'ms Processing',         icon: Zap },
  { value: '4',      label: 'Role-based Levels',     icon: Users },
  { value: '98',     label: '% Detection Accuracy',  icon: CheckCircle },
]

const steps = [
  { num: '01', title: 'Ingest',   desc: 'CCTV frames ingested via RTSP stream or manual upload', icon: Camera },
  { num: '02', title: 'Detect',   desc: 'YOLOv8 identifies vehicles and estimates dwell time via tracking', icon: Cpu },
  { num: '03', title: 'Classify', desc: 'Violation engine matches zone rules and runs OCR on plates', icon: CheckCircle },
  { num: '04', title: 'Enforce',  desc: 'Officers review evidence, issue tickets, AI reports update strategy', icon: Shield },
]

const goals = [
  { icon: Target,    title: 'Our Vision',   desc: 'Build India\'s smartest AI-driven parking enforcement infrastructure — making cities safer, less congested, and easier to manage through real-time intelligence.', bg: 'var(--primary-faint)', ic: 'var(--primary)' },
  { icon: Lightbulb, title: 'Our Mission',  desc: 'Empower traffic authorities with tools that turn raw CCTV footage into actionable enforcement data — reducing violation rates and improving urban mobility.', bg: '#e8f0ff', ic: '#2563eb' },
  { icon: Users,     title: 'For Everyone', desc: 'Designed for officers on the ground, analysts in the office, and administrators overseeing entire city zones — role-based access ensures the right data reaches the right person.', bg: '#e8f8ee', ic: '#16a34a' },
]

const navLinks = [
  { href: '#home',       label: 'Home' },
  { href: '#features',   label: 'Features' },
  { href: '#goals',      label: 'Our Goals' },
  { href: '#howitworks', label: 'How It Works' },
  { href: '#tech',       label: 'Technology' },
  { href: '#contact',    label: 'Contact' },
]

const techStack = [
  ['YOLOv8',     'Object Detection',  'var(--primary-faint)', 'var(--border-light)'],
  ['EasyOCR',    'License Plate',     'var(--accent-faint)',  'var(--border-light)'],
  ['Groq AI',    'LLM Reporting',     '#f3e8ff',             '#e9d5ff'],
  ['FastAPI',    'REST + WebSocket',  '#e8f0ff',             '#bfdbfe'],
  ['React 18',   'Dashboard UI',      '#e8f8ff',             '#bae6fd'],
  ['Leaflet',    'Interactive Maps',  '#e8f8ee',             '#a7f3d0'],
  ['Recharts',   'Data Visualisation','#fff0e8',             '#fddbb0'],
  ['SQLAlchemy', 'ORM + Migrations',  'var(--bg-subtle)',    'var(--border-light)'],
]

// ── platform feature details for footer popup ────────────────────────────────
const PLATFORM_INFO: Record<string, {
  icon: React.ElementType; color: string; bg: string;
  tagline: string; desc: string;
  bullets: string[];
  cta: string; ctaHref: string;
}> = {
  'Dashboard': {
    icon: LayoutDashboard, color: '#22C55E', bg: 'rgba(34,197,94,0.12)',
    tagline: 'Real-time enforcement overview',
    desc: 'A command-center view of your entire parking enforcement operation — updated every 30 seconds.',
    bullets: [
      'Live violation count with % change vs yesterday',
      'Active camera health & offline alerts',
      'Congestion score per zone (0–100)',
      'Recent violations table with quick-review links',
      'Trend charts: 7-day area & top-zone bar graph',
    ],
    cta: 'Open Dashboard', ctaHref: '/app/dashboard',
  },
  'Live Monitor': {
    icon: Video, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',
    tagline: 'Upload frames or stream live webcam',
    desc: 'The core detection interface — submit a parking scene and get annotated results in under 200 ms.',
    bullets: [
      'Drag-and-drop image or video frame upload',
      'Live webcam mode with 1–10 s capture interval',
      'YOLOv8 bounding boxes with confidence scores',
      'OCR license plate extraction with validation',
      'One-click violation save from detection result',
    ],
    cta: 'Try Live Monitor', ctaHref: '/app/monitor',
  },
  'Violations': {
    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',
    tagline: 'Browse and manage incidents',
    desc: 'Full violation lifecycle management — from detection to ticket issuance.',
    bullets: [
      'Filter by zone, type, plate, date range, status',
      'Evidence panel: annotated frame + raw image',
      'Status workflow: Detected → Reviewed → Resolved',
      'Congestion score and vehicle type per incident',
      'Export CSV for offline reporting',
    ],
    cta: 'View Violations', ctaHref: '/app/violations',
  },
  'Heatmap': {
    icon: Map, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',
    tagline: 'Spatial violation density mapping',
    desc: 'Visualise where violations cluster geographically to guide patrol deployment.',
    bullets: [
      'Leaflet.js interactive map with zone overlays',
      'Heatmap layer — intensity = violation count',
      'Time-range filter: today / 7d / 30d / custom',
      'Per-zone tooltip: count, top violation type',
      'Export map snapshot as PNG',
    ],
    cta: 'View Heatmap', ctaHref: '/app/heatmap',
  },
  'Predictions': {
    icon: TrendingUp, color: '#EC4899', bg: 'rgba(236,72,153,0.12)',
    tagline: 'ML-based hotspot forecasting',
    desc: 'Predict which zones will see the most violations before they happen.',
    bullets: [
      'Zone-level risk scores for next 24 hours',
      'Historical pattern analysis (day-of-week, hour)',
      'Confidence bands on forecast charts',
      'Recommended patrol priority list',
      'Model retrained nightly on new violation data',
    ],
    cta: 'View Predictions', ctaHref: '/app/predictions',
  },
}

// ── platform feature modal ────────────────────────────────────────────────────
function PlatformModal({ name, onClose }: { name: string; onClose: () => void }) {
  const info = PLATFORM_INFO[name]
  if (!info) return null
  const Icon = info.icon
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: '2rem', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(15,23,42,0.15)', position: 'relative' }}
      >
        {/* Close */}
        <motion.button onClick={onClose} whileHover={{ background: '#F1F5F9' }}
          style={{ position: 'absolute', top: 14, right: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
          <X size={15} />
        </motion.button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: info.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: info.color }}>
            <Icon size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>{name}</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>{info.tagline}</p>
          </div>
        </div>

        {/* Desc */}
        <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.7, marginBottom: 18 }}>{info.desc}</p>

        {/* Bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {info.bullets.map(b => (
            <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <CheckCircle size={11} style={{ color: '#16A34A' }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>{b}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link to={info.ctaHref} onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.7rem', background: '#16A34A', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none', letterSpacing: '-0.01em' }}
        >
          {info.cta} <ArrowRight size={15} />
        </Link>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [activePopup, setActivePopup] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const { scrollY } = useScroll()
  const blob1Y = useTransform(scrollY, [0, 600], [0, -80])
  const blob2Y = useTransform(scrollY, [0, 600], [0, -40])

  scrollY.on('change', v => setShowScrollTop(v > 300))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', overflowX: 'hidden' }}>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(253,252,240,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-light)', boxShadow: '0 1px 12px rgba(30,60,10,0.07)' }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0, marginRight: 'auto' }}>
            <motion.div whileHover={{ rotate: 8, scale: 1.1 }} style={{ width: 36, height: 36, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(30,60,10,0.25)' }}>
              <Shield size={17} color="#fff" />
            </motion.div>
            <div>
              <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1rem' }}>ParkIQ</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 7 }}>Enforcement Platform</span>
            </div>
          </Link>

          {/* Links */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            {navLinks.map(({ href, label }, i) => (
              <motion.a key={href} href={href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.3 }}
                style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', position: 'relative' }}
                whileHover={{ color: 'var(--primary)' } as never}
              >{label}</motion.a>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/login" className="btn-secondary" style={{ fontSize: '0.875rem', padding: '0.4rem 0.875rem' }}>Sign In</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.4rem 0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                Sign Up <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section id="home" style={{ position: 'relative', overflow: 'hidden', minHeight: '88vh', display: 'flex', alignItems: 'center' }}>
        {/* Parallax blobs */}
        <motion.div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <motion.div style={{ position: 'absolute', top: -80, left: -80, width: 560, height: 560, borderRadius: '50%', background: 'rgba(200,220,100,0.2)', filter: 'blur(70px)', y: blob1Y }} />
          <motion.div style={{ position: 'absolute', top: 80, right: -80, width: 420, height: 420, borderRadius: '50%', background: 'rgba(200,150,0,0.13)', filter: 'blur(70px)', y: blob2Y }} />
          <motion.div style={{ position: 'absolute', bottom: -60, left: '40%', width: 360, height: 360, borderRadius: '50%', background: 'rgba(100,180,100,0.1)', filter: 'blur(60px)' }} />
        </motion.div>

        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center', width: '100%' }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--primary-faint)', border: '1px solid var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, padding: '5px 16px', borderRadius: 9999, marginBottom: 24 }}
          >
            <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
            AI-Powered Smart City Enforcement
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 900, color: 'var(--text-heading)', lineHeight: 1.08, marginBottom: 22 }}
          >
            Smarter Parking.<br />
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }}
              style={{ background: 'linear-gradient(90deg, var(--primary), #4CAF50, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200%' }}
            >
              Safer Cities.
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            style={{ maxWidth: 620, margin: '0 auto 2.5rem', fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}
          >
            ParkIQ uses computer vision, license plate recognition, and Groq AI to detect illegal parking, quantify congestion impact, and enable data-driven enforcement in real time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '3.5rem' }}
          >
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="btn-primary" style={{ padding: '0.85rem 2.5rem', fontSize: '1.05rem', boxShadow: '0 6px 20px rgba(30,60,10,0.28)', display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 14 }}>
                Get Started
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                  <ArrowRight size={18} />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial="hidden" animate="visible" variants={stagger(0.1)}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 700, margin: '0 auto' }}
          >
            {stats.map(s => <StatCard key={s.label} {...s} />)}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <Section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '5rem 1.5rem' }}>
        <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 12 }}>Everything You Need for Smart Enforcement</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto', fontSize: '1rem', lineHeight: 1.7 }}>A complete AI pipeline from camera ingestion to actionable reports — built for traffic authorities.</p>
        </motion.div>
        <motion.div variants={stagger(0.07)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          {features.map(f => <FeatureCard key={f.title} {...f} />)}
        </motion.div>
      </Section>

      {/* ── OUR GOALS ────────────────────────────────────────────────── */}
      <Section id="goals" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 12 }}>Our Goals & Vision</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>Building AI-powered infrastructure for safer, smarter Indian cities — starting with Bengaluru, one parking zone at a time.</p>
          </motion.div>
          <motion.div variants={stagger(0.12)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22 }}>
            {goals.map(({ icon: Icon, title, desc, bg, ic }) => (
              <motion.div key={title} variants={fadeUp}
                whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(30,60,10,0.12)' }}
                style={{ background: 'var(--bg-page)', border: '1px solid var(--border-light)', borderRadius: 20, padding: '2rem', display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <motion.div whileHover={{ rotate: 8, scale: 1.1 }} style={{ width: 56, height: 56, borderRadius: 16, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ic }}>
                  <Icon size={26} />
                </motion.div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-heading)', margin: 0 }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.75, margin: 0 }}>{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <Section id="howitworks" style={{ maxWidth: 1200, margin: '0 auto', padding: '5rem 1.5rem' }}>
        <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 12 }}>How It Works</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>From CCTV feed to enforcement action in under 5 seconds</p>
        </motion.div>
        <motion.div variants={stagger(0.15)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 28 }}>
          {steps.map(({ num, title, desc, icon: Icon }) => (
            <motion.div key={num} variants={fadeUp}
              whileHover={{ y: -5 }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                whileHover={{ rotate: 8, scale: 1.08 }}
                style={{ width: 76, height: 76, borderRadius: 22, background: 'var(--bg-subtle)', border: '2px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary)', boxShadow: '0 4px 16px rgba(30,60,10,0.08)' }}
              >
                <Icon size={30} />
              </motion.div>
              <div style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.14em', marginBottom: 6, opacity: 0.7 }}>{num}</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text-heading)', marginBottom: 8, fontSize: '1.05rem' }}>{title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── TECHNOLOGY ───────────────────────────────────────────────── */}
      <Section id="tech" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 12 }}>Built on Modern AI Stack</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Production-grade components for accuracy, speed, and scalability</p>
          </motion.div>
          <motion.div variants={stagger(0.05)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 14 }}>
            {techStack.map(([label, sub, bg, border]) => (
              <motion.div key={label} variants={fadeUp}
                whileHover={{ y: -5, scale: 1.03, boxShadow: '0 10px 28px rgba(0,0,0,0.1)' }}
                style={{ borderRadius: 14, border: `1px solid ${border}`, padding: '1rem', textAlign: 'center', background: bg, cursor: 'default' }}
              >
                <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>


      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }} viewport={{ once: true }}
        style={{ background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Main footer grid */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '3.5rem 2rem 2.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr', gap: '2.5rem', flexWrap: 'wrap' }}>

          {/* Brand column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #16A34A, #15803D)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(22,163,74,0.35)' }}>
                <Shield size={16} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', letterSpacing: '-0.02em' }}>ParkIQ</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.7, margin: 0, maxWidth: 260 }}>
              AI-powered smart parking intelligence and enforcement platform. Real-time detection, analytics, and reporting for modern cities.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {[
                { href: 'mailto:riteshkumar90359@gmail.com', icon: Mail,    label: 'Email'    },
                { href: 'https://github.com/Riteshkumar2e',  icon: Github,  label: 'GitHub'   },
                { href: 'https://www.linkedin.com/in/riteshkumar-tech/', icon: Linkedin, label: 'LinkedIn' },
              ].map(({ href, icon: Icon, label }) => (
                <motion.a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ y: -2, background: 'rgba(255,255,255,0.12)' } as never}
                  style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', textDecoration: 'none', transition: 'all 0.15s' }}
                >
                  <Icon size={15} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Platform links */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Platform</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Dashboard','Live Monitor','Violations','Heatmap','Predictions'].map(label => (
                <motion.button key={label} onClick={() => setActivePopup(label)}
                  whileHover={{ x: 3, color: '#22C55E' } as never}
                  style={{ fontSize: '0.83rem', color: '#9CA3AF', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.12s' }}
                >{label}</motion.button>
              ))}
            </div>
          </div>

          {/* Developers links */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Developers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['API Docs', '/api/docs'],['Register', '/register'],['Sign In', '/login']].map(([label, href]) => (
                <motion.a key={label} href={href} whileHover={{ x: 3, color: '#22C55E' } as never}
                  style={{ fontSize: '0.83rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500, transition: 'all 0.12s' }}
                >{label}</motion.a>
              ))}
            </div>
          </div>

          {/* Contact column */}
          <div id="contact">
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Mail,    label: 'Email',    value: 'riteshkumar90359@gmail.com', href: 'mailto:riteshkumar90359@gmail.com' },
                { icon: Github,  label: 'GitHub',   value: 'Riteshkumar2e',              href: 'https://github.com/Riteshkumar2e' },
                { icon: Linkedin,label: 'LinkedIn', value: 'riteshkumar-tech',           href: 'https://www.linkedin.com/in/riteshkumar-tech/' },
              ].map(({ icon: Icon, label, value, href }) => (
                <motion.a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  whileHover={{ x: 2 } as never}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', transition: 'all 0.12s' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
                    <Icon size={13} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: '#4B5563', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#D1D5DB', fontWeight: 500, marginTop: 1 }}>{value}</div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', maxWidth: 1200, margin: '0 auto', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#4B5563' }}>© 2025 Ritesh Kumar. All rights reserved.</span>
          <span style={{ fontSize: '0.72rem', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
            Built with <span style={{ color: '#22C55E', fontWeight: 700 }}>YOLOv8</span> · <span style={{ color: '#22C55E', fontWeight: 700 }}>FastAPI</span> · <span style={{ color: '#22C55E', fontWeight: 700 }}>React</span>
          </span>
        </div>
      </motion.footer>

      {/* ── Platform feature popup ────────────────────────────────────── */}
      <AnimatePresence>
        {activePopup && <PlatformModal name={activePopup} onClose={() => setActivePopup(null)} />}
      </AnimatePresence>

      {/* ── Scroll to top ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            whileHover={{ scale: 1.1, boxShadow: '0 8px 24px rgba(22,163,74,0.35)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 999,
              width: 44, height: 44, borderRadius: '50%',
              background: '#16A34A', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: '0 4px 16px rgba(22,163,74,0.25)',
            }}
          >
            <ChevronUp size={20} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
