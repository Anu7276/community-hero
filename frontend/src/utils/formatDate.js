const DATE_OPTS = { day: 'numeric', month: 'short', year: 'numeric' }
const TIME_OPTS = { hour: '2-digit', minute: '2-digit', hour12: true }

export function formatReportDate(dateStr) {
  if (!dateStr) return 'Date unknown'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'Date unknown'
  return d.toLocaleDateString('en-IN', DATE_OPTS)
}

export function formatReportDateTime(dateStr) {
  if (!dateStr) return 'Date unknown'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'Date unknown'
  return `${d.toLocaleDateString('en-IN', DATE_OPTS)} · ${d.toLocaleTimeString('en-IN', TIME_OPTS)}`
}

export function formatReportRelative(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatReportDate(dateStr)
}
