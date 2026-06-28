import { CheckCircle, Clock, Zap, AlertTriangle, Camera } from 'lucide-react'
import { formatReportDateTime } from '../utils/formatDate'

const TIMELINE_STEPS = [
  { status: 'pending',     label: 'Reported',     icon: AlertTriangle, color: 'text-slate-500',   bg: 'bg-slate-200'   },
  { status: 'verified',    label: 'Verified',      icon: CheckCircle,   color: 'text-emerald-700',   bg: 'bg-emerald-500/20'   },
  { status: 'in_progress', label: 'In Progress',   icon: Zap,           color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { status: 'resolved',    label: 'Resolved',      icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-500/20'  },
]

const STATUS_ORDER = { pending: 0, verified: 1, in_progress: 2, resolved: 3 }

export default function IssueTimeline({ issue }) {
  const currentIdx = STATUS_ORDER[issue.status] ?? 0

  return (
    <div className="card p-4 mb-4">
      <p className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-emerald-700" /> Issue Lifecycle
      </p>
      <div className="relative">
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200 z-0" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-emerald-500 to-orange-500 z-0 transition-all duration-700"
          style={{ width: `${(currentIdx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
        />
        <div className="relative z-10 flex justify-between">
          {TIMELINE_STEPS.map((step, i) => {
            const Icon = step.icon
            const done = i <= currentIdx
            const active = i === currentIdx
            return (
              <div key={step.status} className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                  ${done ? `${step.bg} border-current ${step.color}` : 'bg-slate-100 border-slate-200 text-slate-500'}
                  ${active ? 'ring-2 ring-offset-2 ring-offset-white ring-blue-500' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-medium text-center leading-tight ${done ? step.color : 'text-slate-600'}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {issue.created_at && (
        <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-200 flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#1e40af]" />
          Reported on <span className="font-medium text-slate-700">{formatReportDateTime(issue.created_at)}</span>
        </p>
      )}

      {issue.resolve_photo && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
            <Camera className="w-3 h-3" /> Before & After
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative rounded-lg overflow-hidden">
              <img src={issue.image_path} alt="Before" className="w-full h-28 object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-white/85 text-xs text-slate-900 text-center py-0.5 shadow-inner">Before</div>
            </div>
            <div className="relative rounded-lg overflow-hidden">
              <img src={issue.resolve_photo} alt="After" className="w-full h-28 object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-xs text-white text-center py-0.5">✅ After</div>
            </div>
          </div>
          {issue.resolved_by && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Resolved by {issue.resolved_by}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
