import { useState, useEffect, useRef, useCallback } from 'react'

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 5000,
}

export function useGeolocation(options = {}) {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [watching, setWatching] = useState(false)
  const watchIdRef = useRef(null)
  const optionsRef = useRef({ ...DEFAULT_OPTIONS, ...options })
  optionsRef.current = { ...DEFAULT_OPTIONS, ...options }

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setWatching(false)
  }, [])

  const handleSuccess = useCallback((pos) => {
    setPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    })
    setError(null)
    setLoading(false)
  }, [])

  const handleError = useCallback((err) => {
    setError(err)
    setLoading(false)
  }, [])

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported by this browser.' })
      return Promise.reject(new Error('Geolocation not supported'))
    }
    setLoading(true)
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { handleSuccess(pos); resolve(pos) },
        (err) => { handleError(err); reject(err) },
        optionsRef.current
      )
    })
  }, [handleSuccess, handleError])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported by this browser.' })
      return
    }
    stopWatching()
    setLoading(true)
    setWatching(true)
    // Get immediate position first, then start watching for updates
    navigator.geolocation.getCurrentPosition(
      (pos) => { handleSuccess(pos) },
      () => {}, // Ignore error from quick fetch — watchPosition handles errors
      { ...optionsRef.current, timeout: 10000 }
    )
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      optionsRef.current
    )
  }, [handleSuccess, handleError, stopWatching])

  useEffect(() => () => stopWatching(), [stopWatching])

  return {
    position,
    error,
    loading,
    getCurrentPosition,
    startWatching,
    stopWatching,
    isWatching: watching,
  }
}

export function geolocationErrorMessage(err) {
  if (!err) return 'Could not get location.'
  if (err.code === 1) return 'Location permission denied. Please enable it in your browser settings.'
  if (err.code === 2) return 'Location unavailable. Try moving outdoors or enabling GPS.'
  if (err.code === 3) return 'Location request timed out. Please try again.'
  return err.message || 'Could not get location.'
}
