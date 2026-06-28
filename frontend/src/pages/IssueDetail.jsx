import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ThumbsUp, ThumbsDown, MapPin, CheckCircle,
  AlertTriangle, Zap, Brain, MessageSquare, Send, Share2, Bell, Copy, Users, Wrench, IndianRupee, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'
import { issuesAPI, shareOnWhatsApp } from '../utils/api'
import IssueTimeline from '../components/IssueTimeline'
import ReportDateBadge from '../components/ReportDateBadge'
import LocationPreview from '../components/LocationPreview'
import { mapsLink } from '../utils/reverseGeocode'

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    emoji: '🔴' },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', emoji: '🟠' },
  MEDIUM:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', emoji: '🟡' },
  LOW:      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  emoji: '🟢' },
}

const STATUSES = ['pending', 'verified', 'in_progress', 'resolved']
const STATUS_LABELS = { pending: 'Pending', verified: 'Verified', in_progress: 'In Progress', resolved: 'Resolved' }

export default function IssueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [voting, setVoting] = useState(false)
  const [sessionId] = useState(() => localStorage.getItem('session') || 'anon')

  const load = useCallback(async () => {
    try {
      const { data } = await issuesAPI.getOne(id)
      setIssue(data)
    } catch {
      toast.error('Issue not found')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleVote(voteType) {
    if (voting) return
    setVoting(true)
    try {
      await issuesAPI.vote(id, voteType, sessionId)
      await load()
      toast.success(voteType === 'up' ? '👍 Thanks for verifying!' : '👎 Flagged for review')
    } catch {
      toast.error('Could not submit vote')
    } finally {
      setVoting(false)
    }
  }

  async function handleStatusChange(status) {
    const adminKey = prompt('Enter admin key:')
    if (!adminKey) return
    try {
      await issuesAPI.updateStatus(id, status, adminKey)
      load()
      toast.success(`Status updated to ${STATUS_LABELS[status]}`)
    } catch {
      toast.error('Incorrect admin key or failed to update')
    }
  }

  async function handleComment() {
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      const commenterName = localStorage.getItem('reporterName') || 'Anonymous'
      await issuesAPI.addComment(id, { comment, commenterName })
      setComment('')
      load()
      toast.success('Comment added!')
    } catch {
      toast.error('Could not add comment')
    } finally {
      setSubmitting(false)
    }
  }

  function copyLink() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast.success('Link copied!'))
        .catch(() => fallbackCopy(window.location.href))
    } else {
      fallbackCopy(window.location.href)
    }
  }

  function fallbackCopy(text) {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    try { document.execCommand('copy'); toast.success('Link copied!') }
    catch { toast.error('Could not copy link') }
    document.body.removeChild(el)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse">
        <div className="skeleton h-4 w-20 mb-5 rounded" />
        <div className="skeleton h-64 w-full mb-4 rounded-2xl" />
        <div className="flex gap-2 mb-4">
          <div className="skeleton h-7 w-20 rounded-full" />
          <div className="skeleton h-7 w-16 rounded-full" />
        </div>
        <div className="skeleton h-6 w-3/4 mb-2 rounded" />
        <div className="skeleton h-4 w-1/2 mb-5 rounded" />
        <div className="skeleton h-32 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-24 w-full mb-4 rounded-2xl" />
      </div>
    )
  }

  if (!issue) return null

  const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.LOW
  const insights = Array.isArray(issue.proactive_insights) ? issue.proactive_insights : []
  const displayAddress = issue.issue_address || issue.area_description
  const hasCoords = issue.latitude && issue.longitude

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-10 fade-in">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm px-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      <div className="flex items-center gap-1">
        <button onClick={copyLink} className="btn-ghost text-sm px-2">
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button
          onClick={() => issue && shareOnWhatsApp(issue.title, window.location.href)}
          className="btn-ghost text-sm px-2 text-green-400 hover:text-green-300"
          title="Share on WhatsApp"
        >
          <span className="text-lg">💬</span>
        </button>
      </div>
      </div>

      {/* Hero Image */}
      {issue.image_path && (
        <div className="relative rounded-2xl overflow-hidden mb-4 bg-slate-50 shadow-sm">
          <img
            src={issue.image_path.startsWith('data:')
              ? issue.image_path
              : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${issue.image_path}`}
            alt={issue.title}
            className="w-full max-h-72 object-cover"
          />
          <div className={`absolute top-3 right-3 text-sm font-bold px-3 py-1 rounded-full border backdrop-blur-sm ${sev.color} ${sev.bg} ${sev.border}`}>
            {sev.emoji} {issue.severity}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`tag border ${sev.color} ${sev.bg} ${sev.border}`}>{issue.severity}</span>
        <span className="tag bg-slate-100 text-slate-600">{issue.issue_type?.replace(/_/g, ' ')}</span>
        <span className="tag bg-slate-100 text-slate-600">#{issue.id}</span>
        {issue.confidence_overall && (
          <span className="tag bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            🤖 {Math.round(issue.confidence_overall * 100)}% AI confidence
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-slate-900 mb-2 leading-snug">{issue.title}</h1>

      {/* Meta */}
      <div className="mb-5">
        <ReportDateBadge date={issue.created_at} variant="card" showRelative className="mb-3" />
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {displayAddress && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {displayAddress}</span>
          )}
          <span>by <span className="text-slate-600 font-medium">{issue.reporter_name || 'Anonymous'}</span></span>
        </div>
      </div>

      {/* Issue Location */}
      {(hasCoords || displayAddress) && (
        <div className="card p-4 mb-4 border-emerald-500/10">
          <p className="section-title"><MapPin className="w-4 h-4 text-emerald-700" /> Issue Location</p>
          {displayAddress && (
            <p className="text-sm text-slate-700 leading-relaxed mb-2">{displayAddress}</p>
          )}
          {hasCoords && (
            <>
              <p className="text-xs text-slate-500 mb-2">
                GPS: {Number(issue.latitude).toFixed(6)}, {Number(issue.longitude).toFixed(6)}
              </p>
              <LocationPreview lat={issue.latitude} lng={issue.longitude} />
              <a
                href={mapsLink(issue.latitude, issue.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-600 font-medium mt-2 touch-manipulation"
              >
                <MapPin className="w-3 h-3" /> Open in Google Maps
              </a>
            </>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: Users, label: 'Affected', value: issue.affected_population?.toLocaleString() || '?', color: 'text-orange-400' },
          { icon: Wrench, label: 'Fix time', value: issue.estimated_fix_days ? `${issue.estimated_fix_days}d` : '?', color: 'text-emerald-700' },
          { icon: IndianRupee, label: 'Est. cost', value: issue.estimated_cost_inr ? `${(issue.estimated_cost_inr / 1000).toFixed(0)}k` : '?', color: 'text-yellow-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-3 text-center">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
            <p className="text-base font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* AI Reasoning */}
      {issue.ai_reasoning && (
        <div className="card p-4 mb-4 border-emerald-500/10">
          <p className="section-title"><Brain className="w-4 h-4 text-emerald-700" /> AI Analysis</p>
          <p className="text-sm text-slate-700 leading-relaxed">{issue.ai_reasoning}</p>
          {issue.confidence_overall && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-orange-500 rounded-full" style={{ width: `${Math.round(issue.confidence_overall * 100)}%` }} />
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">{Math.round(issue.confidence_overall * 100)}% confidence</span>
            </div>
          )}
        </div>
      )}

      {/* Proactive Insights */}
      {insights.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="section-title"><Zap className="w-4 h-4 text-orange-400" /> Proactive Insights</p>
          <ul className="flex flex-col gap-2">
            {insights.map((ins, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2.5 bg-slate-100 rounded-lg px-3 py-2">
                <span className="text-orange-400 flex-shrink-0 mt-0.5">→</span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Authority */}
      {(issue.required_authority || issue.alert_urgency) && (
        <div className="card p-4 mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Route to Authority</p>
            <p className="text-sm font-semibold text-emerald-700">{issue.required_authority?.replace(/_/g, ' ') || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Alert Urgency</p>
            <p className="text-sm font-semibold text-orange-400">{issue.alert_urgency || '—'}</p>
          </div>
        </div>
      )}

      {issue && <IssueTimeline issue={issue} />}

      {/* Community Voting */}
      <div className="card p-4 mb-4">
        <p className="section-title"><CheckCircle className="w-4 h-4 text-green-400" /> Community Verification</p>
        <p className="text-xs text-slate-500 mb-3">Have you seen this issue? Help verify it!</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleVote('up')}
            disabled={voting}
            className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 active:bg-green-500/30 text-green-400 font-semibold py-3 rounded-xl border border-green-500/20 transition-all touch-manipulation disabled:opacity-50"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Confirm ({issue.upvotes || 0})</span>
          </button>
          <button
            onClick={() => handleVote('down')}
            disabled={voting}
            className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 font-semibold py-3 rounded-xl border border-red-500/20 transition-all touch-manipulation disabled:opacity-50"
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Dispute ({issue.downvotes || 0})</span>
          </button>
        </div>
        {(issue.upvotes || 0) >= 3 && (
          <p className="text-xs text-green-400 mt-2.5 text-center flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3" /> Verified by {issue.upvotes} community members
          </p>
        )}
      </div>

      {/* Status Update */}
      <div className="card p-4 mb-4">
        <p className="section-title">🔄 Update Status <span className="text-slate-600 font-normal text-xs">(admin only)</span></p>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`text-sm py-2.5 rounded-xl border transition-all font-medium touch-manipulation
                ${issue.status === s
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {issue.status === 'resolved' && !issue.resolve_photo && (
        <div className="card p-4 mb-4 border border-green-500/20">
          <p className="section-title"><Camera className="w-4 h-4 text-green-400" /> Add Resolution Photo</p>
          <p className="text-xs text-slate-500 mb-3">Upload an after photo to show the issue is fixed</p>
          <label className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium py-3 rounded-xl border border-dashed border-green-500/30 cursor-pointer touch-manipulation transition-all">
            <Camera className="w-4 h-4" />
            <span className="text-sm">Upload Resolution Photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0]
                if (!file) return
                if (file.size > 2 * 1024 * 1024) return toast.error('Photo must be under 2MB')
                const reader = new FileReader()
                reader.onload = async (ev) => {
                  try {
                    await issuesAPI.resolvePhoto(id, ev.target.result, 'Authority')
                    load()
                    toast.success('Resolution photo added!')
                  } catch { toast.error('Failed to upload photo') }
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
        </div>
      )}

      {/* Comments */}
      <div className="card p-4">
        <p className="section-title"><MessageSquare className="w-4 h-4 text-slate-400" /> Community Updates ({issue.comments?.length || 0})</p>

        {(!issue.comments || issue.comments.length === 0) && (
          <div className="text-center py-6 mb-3">
            <MessageSquare className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No updates yet.</p>
            <p className="text-xs text-slate-500">Be the first to share what you know!</p>
          </div>
        )}

        {issue.comments?.map(c => (
          <div key={c.id} className="border-b border-slate-200 pb-3 mb-3 last:border-0 last:mb-0 last:pb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-emerald-700">{c.commenter_name || 'Anonymous'}</span>
              <span className="text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{c.comment}</p>
          </div>
        ))}

        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !submitting && handleComment()}
            placeholder="Share an update..."
            className="input-field flex-1 py-2.5"
          />
          <button
            onClick={handleComment}
            disabled={submitting || !comment.trim()}
            className="btn-primary px-3 py-2.5 touch-manipulation"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
