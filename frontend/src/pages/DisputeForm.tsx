/**
 * Public dispute submission page — no login required.
 * Accessible at /dispute?ticket=<violation_id>
 */
import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Shield, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import apiClient from '../api/client'

const REASONS = [
  { value: 'incorrect_plate', label: 'Incorrect Plate Number' },
  { value: 'vehicle_not_present', label: 'Vehicle Was Not There' },
  { value: 'valid_permit', label: 'Had Valid Parking Permit' },
  { value: 'signage_unclear', label: 'Signage Was Unclear / Missing' },
  { value: 'other', label: 'Other' },
]

export default function DisputeForm() {
  const [params] = useSearchParams()
  const violationId = params.get('ticket') ?? ''

  const [form, setForm] = useState({
    violation_id: violationId ? parseInt(violationId, 10) : '',
    submitted_by_name: '',
    submitted_by_contact: '',
    reason_category: 'other',
    description: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.violation_id || !form.submitted_by_name || !form.submitted_by_contact || !form.description) {
      toast.error('Please fill all required fields')
      return
    }
    setLoading(true)
    try {
      await apiClient.post('/disputes', form)
      setSubmitted(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const lbl: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 5 }
  const fieldW: React.CSSProperties = { width: '100%', padding: '0.6rem 0.8rem', borderRadius: 10, border: '1.5px solid #D1D5DB', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, background: '#1E3A08', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>ParkIQ</div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Dispute a Parking Violation</div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
              <CheckCircle size={44} color="#16A34A" style={{ margin: '0 auto 12px' }} />
              <h2 style={{ fontWeight: 800, fontSize: '1.15rem', color: '#166534', margin: '0 0 8px' }}>Dispute Submitted</h2>
              <p style={{ color: '#16A34A', fontSize: '0.875rem', margin: '0 0 20px' }}>
                Your dispute for violation #{form.violation_id} has been received. An officer will review it within 3–5 business days.
              </p>
              <Link to="/" style={{ color: '#16A34A', fontWeight: 700, fontSize: '0.875rem' }}>← Back to Home</Link>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={submit}
              style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>Submit a Dispute</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>
                  Contest a parking violation issued by ParkIQ enforcement. All fields marked * are required.
                </p>
              </div>

              <div>
                <label style={lbl}>Violation / Ticket ID *</label>
                <input style={fieldW} type="number" value={form.violation_id} onChange={e => setForm(f => ({ ...f, violation_id: parseInt(e.target.value, 10) }))} placeholder="e.g. 123" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Your Name *</label>
                  <input style={fieldW} value={form.submitted_by_name} onChange={handle('submitted_by_name')} placeholder="Full name" required />
                </div>
                <div>
                  <label style={lbl}>Email / Phone *</label>
                  <input style={fieldW} value={form.submitted_by_contact} onChange={handle('submitted_by_contact')} placeholder="contact@email.com" required />
                </div>
              </div>

              <div>
                <label style={lbl}>Reason for Dispute *</label>
                <select style={fieldW} value={form.reason_category} onChange={handle('reason_category')}>
                  {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Description *</label>
                <textarea style={{ ...fieldW, resize: 'vertical', minHeight: 90 }} value={form.description} onChange={handle('description')}
                  placeholder="Explain why this violation should be dismissed. Include any supporting details (permit number, receipts, etc.)." required />
              </div>

              <button type="submit" disabled={loading}
                style={{ padding: '0.75rem', borderRadius: 12, border: 'none', background: loading ? '#9CA3AF' : '#1E3A08', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                {loading ? 'Submitting...' : 'Submit Dispute'}
              </button>

              <p style={{ margin: 0, textAlign: 'center', fontSize: '0.72rem', color: '#9CA3AF' }}>
                Disputes are reviewed within 3–5 business days. You will be contacted at the email/phone provided.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
