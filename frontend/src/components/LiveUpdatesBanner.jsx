import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, CheckCircle, AlertTriangle, TrendingUp, MapPin, ChevronRight } from 'lucide-react'
import { formatReportDate } from '../utils/formatDate'

const TYPE_LABELS = {
  POTHOLE: 'Pothole', WATER_LEAK: 'Water Leak', STREETLIGHT: 'Street Light',
  GARBAGE: 'Garbage', DRAINAGE: 'Drainage', STREETDAMAGE: 'Street Damage', OTHER: 'Public Issue',
}

const STATUS_LABELS = {
  pending: 'Reported',
  verified: 'Verified',
  in_progress: 'Work in Progress',
  resolved: 'Resolved',
}

function buildUpdates(issues, stats, hotspots) {
  const slides = []

  slides.push({
    id: 'welcome',
    icon: Megaphone,
    accent: 'bg-blue-50 border-blue-200 text-blue-800',
    iconColor: 'text-blue-700',
    title: 'Citizen Grievance Portal',
    body: 'Report public infrastructure issues in your area. Your reports help municipal authorities respond faster.',
    cta: null,
  })

  if (stats?.total > 0) {
    slides.push({
      id: 'stats-total',
      icon: TrendingUp,
      accent: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      iconColor: 'text-emerald-700',
      title: `${stats.total} Issues Registered`,
      body: `${stats.resolved || 0} resolved · ${stats.pending || 0} awaiting action · ${stats.critical || 0} marked critical`,
      cta: null,
    })
  }

  const recent = [...(issues || [])]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 5)

  recent.forEach(issue => {
    const type = TYPE_LABELS[issue.issue_type] || 'Issue'
    const status = STATUS_LABELS[issue.status] || issue.status
    slides.push({
      id: `issue-${issue.id}`,
      icon: issue.status === 'resolved' ? CheckCircle : AlertTriangle,
      accent: issue.status === 'resolved'
        ? 'bg-green-50 border-green-200 text-green-800'
        : issue.severity === 'CRITICAL'
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800',
      iconColor: issue.status === 'resolved' ? 'text-green-700' : 'text-amber-700',
      title: `${type} — ${status}`,
      body: `${issue.title || issue.issue_address || issue.area_description || 'Community issue reported in your neighbourhood.'}${issue.created_at ? ` Reported on ${formatReportDate(issue.created_at)}.` : ''}`,
      cta: { to: `/issues/${issue.id}`, label: 'View details' },
    })
  })

  if (hotspots?.length > 0) {
    const h = hotspots[0]
    slides.push({
      id: `hotspot-${h.id}`,
      icon: MapPin,
      accent: 'bg-orange-50 border-orange-200 text-orange-800',
      iconColor: 'text-orange-700',
      title: `Hotspot Alert — ${h.issue_count} issues nearby`,
      body: h.recommendation || `${h.issue_count} related issues detected within 500 metres.`,
      cta: { to: '/map', label: 'View on map' },
    })
  }

  if (stats?.resolved > 0) {
    slides.push({
      id: 'resolved-rate',
      icon: CheckCircle,
      accent: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-700',
      title: 'Resolution Progress',
      body: `${Math.round((stats.resolved / stats.total) * 100)}% of reported issues have been resolved. Thank you for participating in civic improvement.`,
      cta: null,
    })
  }

  slides.push({
    id: 'report-cta',
    icon: Megaphone,
    accent: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    iconColor: 'text-indigo-700',
    title: 'Spot a Problem? Report It Now',
    body: 'Upload a photo of potholes, water leaks, broken streetlights, or sanitation issues. AI-assisted reporting takes under a minute.',
    cta: { to: '/report', label: 'Report an Issue' },
  })

  return slides
}

export default function LiveUpdatesBanner({ issues = [], stats = null, hotspots = [] }) {
  const slides = useMemo(() => buildUpdates(issues, stats, hotspots), [issues, stats, hotspots])
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setIndex(0)
    setProgress(0)
  }, [slides.length])

  useEffect(() => {
    const tick = 100
    const duration = 10000
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          setIndex(i => (i + 1) % slides.length)
          return 0
        }
        return p + (tick / duration) * 100
      })
    }, tick)
    return () => clearInterval(interval)
  }, [slides.length])

  const slide = slides[index] || slides[0]
  if (!slide) return null

  const Icon = slide.icon

  return (
    <div className="mb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Live Updates</h2>
          <span className="text-xs text-slate-500 font-medium">Refreshes every 10s</span>
        </div>
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); setProgress(0) }}
              aria-label={`Go to update ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-[#1e40af]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
            />
          ))}
        </div>
      </div>

      <div className={`relative border rounded-xl p-5 sm:p-6 slide-up ${slide.accent}`}>
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-lg bg-white/80 border border-current/10 flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className={`w-5 h-5 ${slide.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base sm:text-lg leading-snug mb-1.5">{slide.title}</h3>
            <p className="text-sm opacity-90 leading-relaxed">{slide.body}</p>
            {slide.cta && (
              <Link
                to={slide.cta.to}
                className="inline-flex items-center gap-1 mt-3 text-sm font-semibold hover:underline underline-offset-2"
              >
                {slide.cta.label}
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5">
          <div
            className="h-full bg-[#1e40af]/60 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
