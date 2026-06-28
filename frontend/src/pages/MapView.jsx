import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { useNavigate, Link } from 'react-router-dom'
import L from 'leaflet'
import toast from 'react-hot-toast'
import { issuesAPI } from '../utils/api'
import { useSocket } from '../hooks/useSocket'
import { useGeolocation } from '../hooks/useGeolocation'
import LocationPreview from '../components/LocationPreview'
import { Plus, Crosshair, Loader2 } from 'lucide-react'
import { formatReportDate } from '../utils/formatDate'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SEVERITY_COLOR = {
  CRITICAL: '#EF4444',
  HIGH: '#E85D04',
  MEDIUM: '#F59E0B',
  LOW: '#0E8A63',
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#0E8A63;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(14,138,99,0.9)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function makeIcon(severity) {
  const color = SEVERITY_COLOR[severity] || '#6B7280'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 9.042 14 26 16 26s16-16.958 16-26C32 7.163 24.837 0 16 0z"
      fill="${color}" opacity="0.9"/>
    <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -42] })
}

function PopupLink({ id }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/issues/${id}`)}
      className="text-blue-400 text-xs hover:underline touch-manipulation font-medium"
    >
      View details →
    </button>
  )
}

function MapController({ userPosition, issues, followUser }) {
  const map = useMap()
  const centeredRef = useRef(false)

  useEffect(() => {
    if (centeredRef.current) return
    if (userPosition) {
      map.setView([userPosition.lat, userPosition.lng], 15)
      centeredRef.current = true
      return
    }
    const withCoords = issues.filter(i => i.latitude && i.longitude)
    if (withCoords.length > 0) {
      map.setView([withCoords[0].latitude, withCoords[0].longitude], 15)
      centeredRef.current = true
    }
  }, [userPosition, issues, map])

  useEffect(() => {
    if (followUser && userPosition) {
      map.panTo([userPosition.lat, userPosition.lng])
    }
  }, [followUser, userPosition, map])

  return null
}

export default function MapView() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const { position: userPosition, loading: locating, startWatching, stopWatching, isWatching } = useGeolocation()

  useEffect(() => {
    issuesAPI.getAll({ limit: 200 })
      .then(r => setIssues(r.data || []))
      .catch(() => { toast.error('Could not load map data'); setIssues([]) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    startWatching()
    return () => stopWatching()
  }, [startWatching, stopWatching])

  useSocket(
    (issue) => setIssues(prev => [issue, ...prev]),
    (updated) => setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
  )

  const withCoords = issues.filter(i => i.latitude && i.longitude)
  // Default to center of India if no user position or issues
  const INDIA_CENTER = [20.5937, 78.9629]
  const center = userPosition
    ? [userPosition.lat, userPosition.lng]
    : withCoords.length
      ? [withCoords[0].latitude, withCoords[0].longitude]
      : INDIA_CENTER

  function handleMyLocation() {
    if (isWatching) {
      stopWatching()
      toast('Location tracking stopped')
      return
    }
    startWatching()
    toast.success('Tracking your live location')
  }

  return (
    <div className="relative flex flex-col flex-1 min-h-0 h-[calc(100vh-180px)] sm:h-[calc(100vh-140px)] overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-4 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs overflow-x-auto flex-shrink-0">
        <span className="text-slate-500 font-medium flex-shrink-0">Severity:</span>
        {Object.entries(SEVERITY_COLOR).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />
            <span className="text-slate-500">{s}</span>
          </span>
        ))}
        <span className="ml-auto text-slate-500 flex-shrink-0">{withCoords.length} on map</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-slate-500 text-sm bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading map...
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={15}
        className="flex-1 w-full"
        style={{ background: '#0A0E1A', minHeight: 0, zIndex: 1 }}
      >
        <MapController userPosition={userPosition} issues={withCoords} followUser={isWatching} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
        />
        {userPosition && (
          <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
            <Popup>
              <p className="text-sm font-semibold">You are here</p>
              {userPosition.accuracy && (
                <p className="text-xs text-slate-500">Accuracy: ~{Math.round(userPosition.accuracy)}m</p>
              )}
            </Popup>
          </Marker>
        )}
        {withCoords.map(issue => (
          <React.Fragment key={issue.id}>
            {issue.severity === 'CRITICAL' && (
              <Circle
                center={[issue.latitude, issue.longitude]}
                radius={300}
                pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.08, weight: 1 }}
              />
            )}
            <Marker position={[issue.latitude, issue.longitude]} icon={makeIcon(issue.severity)}>
              <Popup>
                <div className="min-w-[180px] max-w-[240px] text-gray-100">
                  <p className="font-semibold text-sm mb-1 leading-tight text-white">
                    {issue.issue_type?.replace(/_/g, ' ')}
                  </p>
                  {(issue.issue_address || issue.area_description) && (
                    <p className="text-gray-400 mb-2 text-xs leading-tight line-clamp-2">
                      {issue.issue_address || issue.area_description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold" style={{ color: SEVERITY_COLOR[issue.severity] }}>
                      {issue.severity}
                    </span>
                    <span className="text-gray-400 capitalize">{issue.status?.replace(/_/g, ' ')}</span>
                  </div>
                  {issue.created_at && (
                    <p className="text-xs text-gray-400 mb-2">
                      Reported on {formatReportDate(issue.created_at)}
                    </p>
                  )}
                  {issue.affected_population > 0 && (
                    <p className="text-xs text-amber-400 mb-2">~{issue.affected_population?.toLocaleString()} people affected</p>
                  )}
                  <PopupLink id={issue.id} />
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>

      <button
        onClick={handleMyLocation}
        disabled={locating && !userPosition}
        className="absolute top-16 right-4 z-[1000] w-11 h-11 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl flex items-center justify-center shadow-xl touch-manipulation"
        title={isWatching ? 'Stop tracking location' : 'Track live location'}
      >
        {locating && !userPosition
          ? <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
          : <Crosshair className={`w-5 h-5 ${isWatching ? 'text-emerald-700' : 'text-slate-400'}`} />
        }
      </button>

      {!loading && withCoords.length === 0 && issues.length > 0 && (
        <div className="absolute bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 bg-[#111827] border border-[#374151] text-gray-400 text-sm px-4 py-2.5 rounded-xl z-[1000] text-center whitespace-nowrap shadow-xl">
          📍 Tap &quot;Track Live Location&quot; when reporting to pin issues on the map
        </div>
      )}
      {!loading && !userPosition && !locating && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-[#111827] border border-yellow-500/30 text-yellow-400 text-xs px-3 py-2 rounded-lg z-[1000] text-center max-w-[90vw] shadow-xl">
          Allow location access to see your position on the map
        </div>
      )}
      {!loading && issues.length === 0 && (
        <div className="absolute bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 bg-[#111827] border border-[#374151] text-gray-400 text-sm px-5 py-3 rounded-xl z-[1000] text-center shadow-xl">
          <p className="mb-2">No issues reported yet!</p>
          <Link to="/report" className="btn-primary text-xs py-1.5 px-3">
            <Plus className="w-3 h-3" /> Report First Issue
          </Link>
        </div>
      )}

      <Link
        to="/report"
        className="sm:hidden absolute bottom-24 right-4 z-[1000] w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 touch-manipulation"
      >
        <Plus className="w-6 h-6 text-white" />
      </Link>
    </div>
  )
}
