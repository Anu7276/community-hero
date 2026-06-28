import { useState, useEffect } from 'react'
import { Shield, CheckCircle, Clock, Zap, AlertTriangle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { issuesAPI } from '../utils/api'
import ReportDateBadge from '../components/ReportDateBadge'

const AUTHORITY_KEY = 'admin'

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  MEDIUM:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  LOW:      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
}

export default function AuthorityDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('auth_key') === AUTHORITY_KEY)
  const [keyInput, setKeyInput] = useState('')
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [updating, setUpdating] = useState(null)

  useEffect(() => { if (authed) loadIssues() }, [authed, filter])

  async function loadIssues() {
    setLoading(true)
    try {
      const res = await issuesAPI.getAll({ status: filter || undefined, limit: 100 })
      const sorted = (res.data || []).sort((a, b) => {
        const sOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
        return (sOrder[a.severity] - sOrder[b.severity]) || new Date(b.created_at) - new Date(a.created_at)
      })
      setIssues(sorted)
    } catch { toast.error('Failed to load issues') }
    finally { setLoading(false) }
  }

  async function updateStatus(issue, status) {
    setUpdating(issue.id)
    try {
      await issuesAPI.updateStatus(issue.id, status, AUTHORITY_KEY)
      toast.success(`Marked as ${status.replace(/_/g, ' ')}`)
      loadIssues()
    } catch { toast.error('Failed to update') }
    finally { setUpdating(null) }
  }

  function login() {
    if (keyInput === AUTHORITY_KEY) {
      sessionStorage.setItem('auth_key', keyInput)
      setAuthed(true)
      toast.success('Welcome, Authority! 🛡️')
    } else {
      toast.error('Invalid admin key')
    }
  }

  if (!authed) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-6 w-full max-w-sm fade-in">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-blue-100">
              <Shield className="w-7 h-7 text-[#1e40af]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Authority Portal</h2>
            <p className="text-slate-500 text-sm mt-1">For verified municipal officers</p>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter admin key"
              className="input-field"
            />
            <button onClick={login} className="btn-primary justify-center">
              <Shield className="w-4 h-4" /> Access Portal
            </button>
          </div>
        </div>
      </div>
    )
  }

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 pb-10">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" /> Authority Portal
          </h1>
          <p className="text-slate-500 text-sm">Manage infrastructure issues in your jurisdiction</p>
        </div>
        <button onClick={loadIssues} className="btn-ghost"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {criticalCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 font-medium">
            {criticalCount} CRITICAL issue{criticalCount > 1 ? 's' : ''} require immediate attention!
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total', value: issues.length, color: 'text-emerald-700' },
          { label: 'Critical', value: criticalCount, color: 'text-red-400' },
          { label: 'High', value: issues.filter(i => i.severity === 'HIGH').length, color: 'text-orange-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3 text-center">
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { value: '', label: 'All' },
          { value: 'pending', label: '⏳ Pending' },
          { value: 'verified', label: '✅ Verified' },
          { value: 'in_progress', label: '⚡ In Progress' },
          { value: 'resolved', label: '✔️ Resolved' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`flex-shrink-0 text-xs px-3 py-2 rounded-xl font-medium transition-all touch-manipulation
              ${filter === opt.value ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p>No issues in this category</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {issues.map(issue => {
            const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.LOW
            return (
              <div key={issue.id} className={`card p-4 border ${sev.border}`}>
                <div className="flex items-start gap-3">
                  {issue.image_path && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                      <img src={issue.image_path} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sev.color} ${sev.bg} ${sev.border}`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-slate-500">#{issue.id}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1 mb-0.5">{issue.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">{issue.issue_address || issue.area_description || 'Location unknown'}</p>
                    <ReportDateBadge date={issue.created_at} className="mb-2" />
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <span>👥 {issue.affected_population?.toLocaleString() || '?'} people</span>
                      <span>·</span>
                      <span>🏛️ {issue.required_authority?.replace(/_/g, ' ') || 'Authority'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {issue.status !== 'verified' && issue.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(issue, 'verified')}
                          disabled={updating === issue.id}
                          className="text-xs bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all touch-manipulation disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-1" />Verify
                        </button>
                      )}
                      {issue.status !== 'in_progress' && (
                        <button
                          onClick={() => updateStatus(issue, 'in_progress')}
                          disabled={updating === issue.id}
                          className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1.5 rounded-lg hover:bg-yellow-500/20 transition-all touch-manipulation disabled:opacity-50"
                        >
                          <Zap className="w-3 h-3 inline mr-1" />Start Work
                        </button>
                      )}
                      {issue.status !== 'resolved' && (
                        <button
                          onClick={() => updateStatus(issue, 'resolved')}
                          disabled={updating === issue.id}
                          className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1.5 rounded-lg hover:bg-green-500/20 transition-all touch-manipulation disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-1" />Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {updating === issue.id && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-emerald-700">
                    <div className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
