import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Car, Shield } from 'lucide-react'
import { search } from '../api'
import { StatusBadge } from '../components/ViolationBadge'
import { format } from 'date-fns'
import PageWrapper from '../components/PageWrapper'

export default function Search() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setDebouncedQuery(query.trim())
  }

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  })

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 768 }}>
      <div>
        <h1 className="section-title">Search</h1>
        <p className="section-sub">Search violations by license plate, vehicle type, or location</p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <SearchIcon size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Enter plate number (e.g. MH 12 AB 1234)" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        </div>
        <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem' }}>Search</button>
      </form>

      {isLoading && (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Searching...</div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Found <span style={{ fontWeight: 700, color: 'var(--text-body)' }}>{data.total}</span> result(s) for "<span style={{ fontWeight: 700, color: 'var(--text-body)' }}>{debouncedQuery}</span>"
          </div>

          {data.violations.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={14} style={{ color: 'var(--danger)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)' }}>Violations ({data.violations.length})</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th className="th">ID</th><th className="th">Plate</th><th className="th">Type</th>
                    <th className="th">Status</th><th className="th" style={{ textAlign: 'right' }}>Congestion</th><th className="th">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.violations.map((v: Record<string, unknown>) => (
                    <tr key={v.id as number} className="table-row">
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <Link to={`/app/violations/${v.id}`} style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700, textDecoration: 'none' }}>#{v.id as number}</Link>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: 'var(--text-body)' }}>{v.plate_number as string}</td>
                      <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{(v.violation_type as string).replace(/_/g, ' ')}</td>
                      <td style={{ padding: '0.65rem 1rem' }}><StatusBadge status={v.status as any} /></td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{Number(v.congestion_score).toFixed(0)}</td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                        {v.timestamp ? format(new Date(v.timestamp as string), 'MMM d, HH:mm') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.plates.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Car size={14} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-body)' }}>Plate Records ({data.plates.length})</span>
              </div>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th className="th">Plate</th><th className="th">Violation</th>
                    <th className="th" style={{ textAlign: 'right' }}>Confidence</th><th className="th">Verified</th><th className="th">Detected At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.plates.map((p: Record<string, unknown>) => (
                    <tr key={p.id as number} className="table-row">
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: 'var(--text-body)' }}>{p.normalized_text as string}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <Link to={`/app/violations/${p.violation_id}`} style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>#{p.violation_id as number}</Link>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{(Number(p.confidence) * 100).toFixed(0)}%</td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: p.is_verified ? 'var(--success)' : 'var(--text-faint)' }}>
                          {p.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                        {p.detected_at ? format(new Date(p.detected_at as string), 'MMM d, HH:mm') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.total === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-faint)', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-light)' }}>
              No results found for "{debouncedQuery}"
            </div>
          )}
        </div>
      )}
      </div>
    </PageWrapper>
  )
}

