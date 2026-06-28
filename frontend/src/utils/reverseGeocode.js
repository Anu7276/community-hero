let lastFetchAt = 0
const MIN_INTERVAL_MS = 1100

export async function reverseGeocode(lat, lng) {
  const now = Date.now()
  if (now - lastFetchAt < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - (now - lastFetchAt)))
  }
  lastFetchAt = Date.now()

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'Accept': 'application/json',
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.display_name || null
}

export function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}
