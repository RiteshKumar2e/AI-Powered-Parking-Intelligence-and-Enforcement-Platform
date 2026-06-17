import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Loader, ChevronRight } from 'lucide-react'
import { getReports, createReport } from '../api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Report } from '../types'
import PageWrapper from '../components/PageWrapper'

const REPORT_TYPES = [
  { value: 'violation_summary', label: 'Violation Summary' },
  { value: 'zone_analysis', label: 'Zone Analysis' },
  { value: 'daily_digest', label: 'Daily Digest' },
  { value: 'incident_report', label: 'Incident Report' },
  { value: 'enforcement_recommendation', label: 'Enforcement Recommendation' },
  { value: 'trend_analysis', label: 'Trend Analysis' },
]

export default function Reports() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Report | null>(null)
  const [reportType, setReportType] = useState('daily_digest')
  const [generating, setGenerating] = useState(false)

  const { data: reports } = useQuery({ queryKey: ['reports'], queryFn: () => getReports() })

  const createMutation = useMutation({
    mutationFn: createReport,
    onMutate: () => setGenerating(true),
    onSuccess: (data) => {
      toast.success('Report generated successfully')
      qc.invalidateQueries({ queryKey: ['reports'] })
      setSelected(data)
      setGenerating(false)
    },
    onError: () => {
      toast.error('Failed to generate report')
      setGenerating(false)
    },
  })

  const handleGenerate = () => {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    createMutation.mutate({ report_type: reportType, period_start: dayAgo.toISOString(), period_end: now.toISOString() })
  }

  return (
    <PageWrapper>
      <div>
        <h1 className="section-title">Enforcement Reports</h1>
        <p className="section-sub">AI-generated reports using Claude LLM analysis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Generate New Report</h3>
            <select className="input" style={{ marginBottom: 8 }} value={reportType} onChange={e => setReportType(e.target.value)}>
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={handleGenerate} disabled={generating} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {generating ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              {generating ? 'Generating with Claude...' : 'Generate Report'}
            </button>
          </div>

          <div>
            <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Past Reports</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(reports ?? []).map((r: Report) => (
                <button key={r.id} onClick={() => setSelected(r)} style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12, fontSize: '0.875rem', cursor: 'pointer', transition: 'var(--transition)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: selected?.id === r.id ? 'var(--primary)' : 'transparent',
                  color: selected?.id === r.id ? '#fff' : 'var(--text-secondary)',
                  border: selected?.id === r.id ? '1px solid var(--primary)' : '1px solid transparent',
                }}
                  onMouseEnter={e => { if (selected?.id !== r.id) e.currentTarget.style.background = 'var(--bg-subtle)' }}
                  onMouseLeave={e => { if (selected?.id !== r.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150, color: selected?.id === r.id ? '#fff' : 'var(--text-body)' }}>{r.title}</div>
                    <div style={{ fontSize: '0.72rem', textTransform: 'capitalize', color: selected?.id === r.id ? 'rgba(255,255,255,0.7)' : 'var(--text-faint)' }}>{r.report_type?.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: '0.72rem', color: selected?.id === r.id ? 'rgba(255,255,255,0.5)' : 'var(--text-faint)' }}>{r.created_at ? format(new Date(r.created_at), 'MMM d, HH:mm') : ''}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: selected?.id === r.id ? 'rgba(255,255,255,0.6)' : 'var(--text-faint)', flexShrink: 0 }} />
                </button>
              ))}
              {(!reports || reports.length === 0) && !generating && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'center', padding: '0.75rem' }}>No reports yet. Generate one above.</p>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ overflowY: 'auto', maxHeight: 700 }}>
          {selected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>{selected.title}</h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 2 }}>
                    {selected.created_at ? format(new Date(selected.created_at), 'PPpp') : ''}
                    {selected.llm_model && ` · ${selected.llm_model}`}
                    {selected.input_tokens ? ` · ${selected.input_tokens + selected.output_tokens} tokens` : ''}
                  </p>
                </div>
                <span style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: '0.72rem', padding: '2px 10px', borderRadius: 9999, fontWeight: 600, textTransform: 'capitalize', flexShrink: 0 }}>
                  {selected.report_type?.replace(/_/g, ' ')}
                </span>
              </div>
              {selected.summary && (
                <div style={{ background: 'var(--accent-faint)', border: '1px solid var(--accent-light)', borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--accent-hover)', lineHeight: 1.6 }}>{selected.summary}</p>
                </div>
              )}
              {selected.content && (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.7, fontFamily: 'inherit', color: 'var(--text-body)', margin: 0 }}>{selected.content}</pre>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, color: 'var(--text-faint)' }}>
              <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem' }}>Select or generate a report to view</p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}

