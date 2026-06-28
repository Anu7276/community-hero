import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.8)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function Recenter({ lat, lng }) {
  const map = useMap()
  map.setView([lat, lng], map.getZoom())
  return null
}

export default function LocationPreview({ lat, lng }) {
  if (!lat || !lng) return null
  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)
  if (isNaN(latitude) || isNaN(longitude)) return null

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height: 180, width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latitude, longitude]} icon={userIcon} />
        <Recenter lat={latitude} lng={longitude} />
      </MapContainer>
    </div>
  )
}
