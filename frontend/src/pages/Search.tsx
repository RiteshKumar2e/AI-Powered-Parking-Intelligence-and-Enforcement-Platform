import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Car, Shield } from 'lucide-react'
import { search } from '../api'
import { StatusBadge } from '../components/ViolationBadge'
import { format } from 'date-fns'

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
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">Search</h1>
        <p className="text-sm text-gray-400">Search violations by license plate, vehicle type, or location</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            className="input pl-9"
            placeholder="Enter plate number (e.g. MH 12 AB 1234)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary px-6">Search</button>
      </form>

      {isLoading && (
        <div className="text-gray-400 text-sm">Searching...</div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            Found {data.total} result(s) for "<span className="text-white">{debouncedQuery}</span>"
          </div>

          {/* Violations */}
          {data.violations.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <Shield size={14} className="text-red-400" />
                <span className="text-sm font-medium text-gray-300">Violations ({data.violations.length})</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
                    <th className="text-left px-4 py-2.5">ID</th>
                    <th className="text-left px-4 py-2.5">Plate</th>
                    <th className="text-left px-4 py-2.5">Type</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-right px-4 py-2.5">Congestion</th>
                    <th className="text-left px-4 py-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.violations.map((v: Record<string, unknown>) => (
                    <tr key={v.id as number} className="table-row">
                      <td className="px-4 py-2.5">
                        <Link to={`/violations/${v.id}`} className="text-blue-400 hover:text-blue-300 font-mono">
                          #{v.id as number}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-200">{v.plate_number as string}</td>
                      <td className="px-4 py-2.5 text-gray-400 capitalize">{(v.violation_type as string).replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={v.status as any} /></td>
                      <td className="px-4 py-2.5 text-right text-gray-300">{Number(v.congestion_score).toFixed(0)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {v.timestamp ? format(new Date(v.timestamp as string), 'MMM d, HH:mm') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Plate Records */}
          {data.plates.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <Car size={14} className="text-blue-400" />
                <span className="text-sm font-medium text-gray-300">Plate Records ({data.plates.length})</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
                    <th className="text-left px-4 py-2.5">Plate</th>
                    <th className="text-left px-4 py-2.5">Violation</th>
                    <th className="text-right px-4 py-2.5">Confidence</th>
                    <th className="text-left px-4 py-2.5">Verified</th>
                    <th className="text-left px-4 py-2.5">Detected At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.plates.map((p: Record<string, unknown>) => (
                    <tr key={p.id as number} className="table-row">
                      <td className="px-4 py-2.5 font-mono text-gray-200">{p.normalized_text as string}</td>
                      <td className="px-4 py-2.5">
                        <Link to={`/violations/${p.violation_id}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs">
                          #{p.violation_id as number}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300">{(Number(p.confidence) * 100).toFixed(0)}%</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs ${p.is_verified ? 'text-green-400' : 'text-gray-500'}`}>
                          {p.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {p.detected_at ? format(new Date(p.detected_at as string), 'MMM d, HH:mm') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.total === 0 && (
            <div className="text-center py-8 text-gray-500">
              No results found for "{debouncedQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
