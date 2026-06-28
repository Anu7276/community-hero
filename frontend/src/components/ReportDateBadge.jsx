import { Calendar } from 'lucide-react'
import { formatReportDate, formatReportDateTime, formatReportRelative } from '../utils/formatDate'

export default function ReportDateBadge({
  date,
  variant = 'compact',
  showRelative = false,
  className = '',
}) {
  if (!date) return null

  const label = variant === 'full'
    ? formatReportDateTime(date)
    : formatReportDate(date)
  const relative = showRelative ? formatReportRelative(date) : null

  if (variant === 'card') {
    return (
      <div className={`flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 ${className}`}>
        <Calendar className="w-3.5 h-3.5 text-[#1e40af] flex-shrink-0" />
        <span>
          <span className="font-medium text-slate-700">Reported on </span>
          {label}
          {relative && relative !== label && (
            <span className="text-slate-400"> · {relative}</span>
          )}
        </span>
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-slate-500 ${className}`} title={`Reported on ${label}`}>
      <Calendar className="w-3 h-3 flex-shrink-0" />
      <span>
        {variant === 'full' ? (
          <>Reported on <span className="font-medium text-slate-700">{label}</span></>
        ) : (
          <>Reported {label}</>
        )}
        {showRelative && relative && relative !== label && (
          <span className="text-slate-400"> ({relative})</span>
        )}
      </span>
    </span>
  )
}
