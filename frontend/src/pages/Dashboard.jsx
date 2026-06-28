import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock, TrendingUp, FilePlus, Trophy, Star, Brain, RefreshCw, Filter, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import IssueCard from '../components/IssueCard'
import LiveUpdatesBanner from '../components/LiveUpdatesBanner'
import { issuesAPI } from '../utils/api'
import { useSocket } from '../hooks/useSocket'
import { usePushNotifications } from '../hooks/usePushNotifications'

const TYPE_EMOJI = { POTHOLE:'🕳️', WATER_LEAK:'💧', STREETLIGHT:'💡', GARBAGE:'🗑️', DRAINAGE:'🌊', STREETDAMAGE:'🛣️', OTHER:'⚠️' }
const SEVERITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const TYPES = ['', 'POTHOLE', 'WATER_LEAK', 'STREETLIGHT', 'GARBAGE', 'DRAINAGE', 'STREETDAMAGE', 'OTHER']
const STATUSES = ['', 'pending', 'verified', 'in_progress', 'resolved']

function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-44 w-full" />
      <div className="p-4 flex flex-col gap-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-full" />
        <div className="flex justify-between pt-2">
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { notifyNewIssue } = usePushNotifications()
  const [issues, setIssues] = useState([])
  const [stats, setStats] = useState(null)
  const [hotspots, setHotspots] = useState([])
  const [filter, setFilter] = useState({ severity: '', type: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [sessionId] = useState(() => {
    const existing = localStorage.getItem('session')
    if (existing) return existing
    const id = Math.random().toString(36).slice(2)
    localStorage.setItem('session', id)
    return id
  })

  const loadData = useCallback(async () => {
    try {
      const [issuesRes, statsRes, hotspotsRes] = await Promise.allSettled([
        issuesAPI.getAll(filter),
        issuesAPI.getStats(sessionId),
        issuesAPI.getHotspots(),
      ])
      if (issuesRes.status === 'fulfilled') setIssues(issuesRes.value.data)
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (hotspotsRes.status === 'fulfilled') setHotspots(hotspotsRes.value.data.hotspots || [])
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [filter.severity, filter.type, filter.status, sessionId])

  useEffect(() => { loadData() }, [loadData])

  useSocket(
    (newIssue) => {
      setIssues(prev => [newIssue, ...prev])
      toast.success(`New issue: ${newIssue.issue_type?.replace(/_/g, ' ')}`, { icon: '🚨' })
      notifyNewIssue(newIssue)
    },
    (updated) => setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
  )

  async function handleVote(issueId, voteType) {
    try {
      await issuesAPI.vote(issueId, voteType, sessionId)
      loadData()
    } catch {
      toast.error('Failed to vote')
    }
  }

  const hasActiveFilter = filter.severity || filter.type || filter.status

  return (
    <div className="bg-white min-h-full">
      {/* Page Hero */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#1e40af] uppercase tracking-widest mb-1">Citizen Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Public Infrastructure Monitoring
              </h1>
              <p className="text-slate-600 text-sm mt-1.5 max-w-xl">
                Track community issues, view live updates, and help your municipality maintain public infrastructure.
              </p>
            </div>
            <Link to="/report" className="btn-primary w-full sm:w-auto justify-center">
              <FilePlus className="w-4 h-4" /> Report an Issue
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 pb-10">

        {/* Live Updates — rotates every 10s */}
        <LiveUpdatesBanner issues={issues} stats={stats} hotspots={hotspots} />

        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Reported', value: stats.total, icon: TrendingUp, color: 'text-[#1e40af]', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
              { label: 'Pending Action', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`stat-card flex items-center gap-3 ${border}`}>
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Impact counters */}
        {stats && stats.total > 0 && (
          <div className="card p-4 mb-6">
            <p className="section-title"><BarChart3 className="w-4 h-4 text-[#1e40af]" /> Community Impact</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Issues Reported', value: stats.total, color: 'text-[#1e40af]' },
                { label: 'Resolved', value: stats.resolved, color: 'text-green-600' },
                { label: 'People Protected', value: stats.totalPeopleProtected?.toLocaleString() || '0', color: 'text-[#FF9933]' },
                { label: 'Avg Resolution', value: stats.avgResolutionDays ? `${stats.avgResolutionDays} days` : '—', color: 'text-slate-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center bg-slate-50 rounded-lg py-3 px-2 border border-slate-100">
                  <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotspot Alert */}
        {hotspots.length > 0 && (
          <div className="card p-4 mb-6 border-red-200 fade-in">
            <p className="section-title text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Priority Hotspot Alert — {hotspots.length} cluster{hotspots.length > 1 ? 's' : ''} detected
            </p>
            <div className="flex flex-col gap-3">
              {hotspots.slice(0, 2).map(h => (
                <div key={h.id} className={`rounded-lg p-3 border ${
                  h.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                  h.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900">
                        {h.issue_count} issues within 500m
                        {h.area_description ? ` · ${h.area_description}` : ''}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{h.recommendation}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      h.severity === 'CRITICAL' ? 'text-red-700 bg-red-100' :
                      h.severity === 'HIGH' ? 'text-orange-700 bg-orange-100' :
                      'text-amber-700 bg-amber-100'
                    }`}>{h.severity}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {h.types.map(t => (
                      <span key={t} className="tag">
                        {TYPE_EMOJI[t] || '⚠️'} {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {h.total_affected > 0 && (
                      <span className="text-xs text-orange-700 ml-auto font-medium">
                        ~{h.total_affected.toLocaleString()} people affected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community Heroes */}
        {stats && stats.total > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="section-title mb-0"><Trophy className="w-4 h-4 text-amber-500" /> Active Citizens</p>
              <span className="text-xs text-slate-500">Top reporters this month</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {(stats.topReporters || []).length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center w-full">
                  No reporters yet — be the first to report an issue.
                </div>
              ) : (
                (stats.topReporters || []).map(r => (
                  <div key={r.name} className="flex-shrink-0 bg-slate-50 border border-slate-100 rounded-lg p-3 text-center min-w-[90px]">
                    <div className="text-2xl mb-1.5">{r.medal}</div>
                    <p className="text-xs font-semibold text-slate-900 truncate max-w-[80px]">{r.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.badge}</p>
                    <p className="text-xs text-amber-600 font-bold mt-1">{r.score} pts</p>
                  </div>
                ))
              )}
              <div className="flex-shrink-0 bg-blue-50 border border-blue-100 rounded-lg p-3 text-center min-w-[90px]">
                <Star className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-900">You</p>
                <p className="text-xs text-[#1e40af] font-bold mt-1">{stats.myScore ?? 0} pts</p>
                <p className="text-xs text-slate-600 mt-0.5">{stats.myIssuesCount ?? 0} reports</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights */}
        {stats?.byType?.length > 0 && (
          <div className="card p-4 mb-6">
            <p className="section-title"><Brain className="w-4 h-4 text-[#1e40af]" /> Issue Analysis</p>
            <div className="flex flex-col gap-2">
              {stats.byType.slice(0, 3).map(({ issue_type, count }) => (
                <div key={issue_type} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <span className="text-xl">{TYPE_EMOJI[issue_type] || '⚠️'}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900">{issue_type.replace(/_/g, ' ')}</p>
                    <div className="h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1e40af] to-[#138808] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((count / Math.max(stats.total, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-[#1e40af] font-bold">{count}</span>
                </div>
              ))}
              {stats.critical > 0 && (
                <p className="text-xs text-red-700 mt-1 flex items-center gap-1.5 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {stats.critical} critical issue{stats.critical > 1 ? 's' : ''} require immediate attention
                </p>
              )}
            </div>
          </div>
        )}

        {/* Issues Section Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reported Issues</h2>
            <p className="text-xs text-slate-500 mt-0.5">{issues.length} issue{issues.length !== 1 ? 's' : ''} in your community</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`btn-secondary text-sm ${hasActiveFilter ? 'border-[#1e40af]/40 text-[#1e40af]' : ''}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilter && ' •'}
            </button>
            <button onClick={loadData} className="btn-ghost text-sm">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 fade-in mb-4">
            <select
              aria-label="Filter by severity"
              value={filter.severity}
              onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}
              className="input-field py-2 px-3 flex-1 min-w-[130px]"
            >
              {SEVERITIES.map(s => <option key={s} value={s}>{s || 'All Severities'}</option>)}
            </select>
            <select
              aria-label="Filter by type"
              value={filter.type}
              onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
              className="input-field py-2 px-3 flex-1 min-w-[130px]"
            >
              {TYPES.map(t => <option key={t} value={t}>{t ? t.replace(/_/g, ' ') : 'All Types'}</option>)}
            </select>
            <select
              aria-label="Filter by status"
              value={filter.status}
              onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
              className="input-field py-2 px-3 flex-1 min-w-[130px]"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Statuses'}</option>)}
            </select>
            {hasActiveFilter && (
              <button
                onClick={() => setFilter({ severity: '', type: '', status: '' })}
                className="text-xs text-slate-500 hover:text-slate-900 touch-manipulation px-2 py-1"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Issues Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-16 fade-in card border-dashed">
            <div className="text-5xl mb-4">{hasActiveFilter ? '🔍' : '🛡️'}</div>
            <p className="font-bold text-slate-900 text-lg mb-2">
              {hasActiveFilter ? 'No matching issues' : 'All Clear!'}
            </p>
            <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
              {hasActiveFilter
                ? 'Try changing or clearing your filters to see more issues.'
                : 'Your community looks clean! Be a hero — report if you spot an issue.'}
            </p>
            {!hasActiveFilter && (
              <Link to="/report" className="btn-primary inline-flex">
                <FilePlus className="w-4 h-4" /> Report First Issue
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {issues.map(issue => (
              <IssueCard key={issue.id} issue={issue} onVote={handleVote} />
            ))}
          </div>
        )}

        {/* Impact Overview */}
        {stats && stats.total > 0 && (
          <div className="mt-8 card p-4">
            <p className="section-title"><BarChart3 className="w-4 h-4 text-[#1e40af]" /> Performance Overview</p>
            <p className="text-xs text-slate-600 mb-3">Based on {stats.total} report{stats.total !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Resolution Rate', value: `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`, color: 'text-green-600', bar: 'bg-green-500', width: stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0 },
                { label: 'Verification Rate', value: `${stats.total > 0 ? Math.round(((stats.total - stats.pending) / stats.total) * 100) : 0}%`, color: 'text-[#1e40af]', bar: 'bg-[#1e40af]', width: stats.total > 0 ? ((stats.total - stats.pending) / stats.total) * 100 : 0 },
              ].map(({ label, value, color, bar, width }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
