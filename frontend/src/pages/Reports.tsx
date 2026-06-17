import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Loader, ChevronRight } from 'lucide-react'
import { getReports, createReport } from '../api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Report } from '../types'

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

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: () => getReports(),
  })

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
    createMutation.mutate({
      report_type: reportType,
      period_start: dayAgo.toISOString(),
      period_end: now.toISOString(),
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Enforcement Reports</h1>
        <p className="text-sm text-gray-400">AI-generated reports using Claude LLM analysis</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Report List */}
        <div className="card space-y-3">
          {/* Generate New */}
          <div className="pb-3 border-b border-gray-800">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Generate New Report</h3>
            <select className="input mb-2" value={reportType} onChange={e => setReportType(e.target.value)}>
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {generating ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
              {generating ? 'Generating with Claude...' : 'Generate Report'}
            </button>
          </div>

          {/* Past Reports */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Past Reports</h3>
            <div className="space-y-1">
              {(reports ?? []).map((r: Report) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    selected?.id === r.id ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <div>
                    <div className="font-medium text-xs truncate max-w-[160px]">{r.title}</div>
                    <div className="text-xs text-gray-500 capitalize">{r.report_type?.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-gray-600">{r.created_at ? format(new Date(r.created_at), 'MMM d, HH:mm') : ''}</div>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 shrink-0" />
                </button>
              ))}
              {(!reports || reports.length === 0) && !generating && (
                <p className="text-xs text-gray-600 text-center py-2">No reports yet. Generate one above.</p>
              )}
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="card col-span-2 overflow-auto" style={{ maxHeight: 700 }}>
          {selected ? (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">{selected.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selected.created_at ? format(new Date(selected.created_at), 'PPpp') : ''}
                    {selected.llm_model && ` · ${selected.llm_model}`}
                    {selected.input_tokens ? ` · ${selected.input_tokens + selected.output_tokens} tokens` : ''}
                  </p>
                </div>
                <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded capitalize">
                  {selected.report_type?.replace(/_/g, ' ')}
                </span>
              </div>
              {selected.summary && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-300">{selected.summary}</p>
                </div>
              )}
              {selected.content && (
                <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{selected.content}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600">
              <FileText size={40} className="mb-3 opacity-30" />
              <p>Select or generate a report to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
