import { Link } from 'react-router-dom'
import { MapPin, ThumbsUp, ThumbsDown, Clock, CheckCircle, Zap } from 'lucide-react'
import ReportDateBadge from './ReportDateBadge'
import { apiUrl } from '../utils/api'

const TYPE_ICONS = {
  POTHOLE: '🕳️', WATER_LEAK: '💧', STREETLIGHT: '💡',
  GARBAGE: '🗑️', DRAINAGE: '🌊', STREETDAMAGE: '🛣️', OTHER: '⚠️',
}
const TYPE_LABELS = {
  POTHOLE: 'Pothole', WATER_LEAK: 'Water Leak', STREETLIGHT: 'Street Light',
  GARBAGE: 'Garbage', DRAINAGE: 'Drainage', STREETDAMAGE: 'Street Damage', OTHER: 'Other',
}
const STATUS_CONFIG = {
  pending:     { icon: Clock,        color: 'text-slate-500',   bg: 'bg-slate-200/70',   label: 'Pending' },
  verified:    { icon: CheckCircle,  color: 'text-emerald-700',   bg: 'bg-emerald-500/10',   label: 'Verified' },
  in_progress: { icon: Zap,          color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'In Progress' },
  resolved:    { icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'Resolved' },
}
const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  MEDIUM:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  LOW:      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
}

export default function IssueCard({ issue, onVote }) {
  const status = STATUS_CONFIG[issue.status] || STATUS_CONFIG.pending
  const severity = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.LOW
  const StatusIcon = status.icon

  return (
    <Link
      to={`/issues/${issue.id}`}
      className={`card-hover flex flex-col overflow-hidden touch-manipulation active:scale-[0.98] transition-transform ${issue.severity === 'CRITICAL' ? 'pulse-critical' : ''}`}
    >
      {issue.image_path ? (
        <div className="relative h-44 overflow-hidden bg-slate-100">
            <img
              src={issue.image_path?.startsWith('data:')
                ? issue.image_path
                : apiUrl(issue.image_path)}
            alt={issue.title}
            className="w-full h-full object-cover"
            onError={e => { e.target.parentElement.style.display = 'none' }}
          />
          <div className={`absolute top-3 right-3 text-[11px] font-semibold px-3 py-1 rounded-full border backdrop-blur-sm ${severity.color} ${severity.bg} ${severity.border}`}>
            {issue.severity}
          </div>
          <div className="absolute top-3 left-3 bg-white/90 text-slate-900 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <span>{TYPE_ICONS[issue.issue_type] || '⚠️'}</span>
            <span>{TYPE_LABELS[issue.issue_type] || 'Issue'}</span>
          </div>
          {issue.confidence_overall != null && issue.confidence_overall > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-xs text-white px-2.5 py-1 rounded-full font-medium border border-white/10">
              🤖 {Math.round(issue.confidence_overall * 100)}% AI
            </div>
          )}
        </div>
      ) : (
        <div className="h-28 bg-slate-100 flex items-center justify-center">
          <span className="text-4xl text-slate-400">{TYPE_ICONS[issue.issue_type] || '⚠️'}</span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1 text-slate-900">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-1 mb-1">
            {issue.title}
          </h3>
          {issue.issue_address || issue.area_description ? (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">{issue.issue_address || issue.area_description}</span>
            </p>
          ) : null}
          <ReportDateBadge date={issue.created_at} showRelative className="mt-1.5" />
        </div>

        {issue.ai_reasoning && (
          <p className="text-xs text-slate-500 line-clamp-2 border-l-2 border-[#1e40af]/30 pl-2 italic leading-relaxed">
            "{issue.ai_reasoning.slice(0, 80)}..."
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-200">
          <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium ${status.color} ${status.bg}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={e => { e.preventDefault(); onVote?.(issue.id, 'up') }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors touch-manipulation p-1"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{issue.upvotes || 0}</span>
            </button>
            <button
              onClick={e => { e.preventDefault(); onVote?.(issue.id, 'down') }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-orange-500 transition-colors touch-manipulation p-1"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>{issue.downvotes || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
