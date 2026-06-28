import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Camera, MapPin, Loader2, CheckCircle, AlertTriangle, Zap, Brain, Bell, Copy, X, ChevronRight, User, Mic, MicOff, Video, StopCircle, FlipHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeAPI } from '../utils/api'
import { formatReportDateTime } from '../utils/formatDate'
import { useGeolocation, geolocationErrorMessage } from '../hooks/useGeolocation'
import LocationPreview from '../components/LocationPreview'
import { useVoice } from '../hooks/useVoice'
import { reverseGeocode } from '../utils/reverseGeocode'

const AI_STEPS = [
  { label: 'Image received & validated', icon: '📷' },
  { label: 'Visual analysis in progress', icon: '👁️' },
  { label: 'Issue detection running', icon: '🔍' },
  { label: 'Severity assessment', icon: '⚠️' },
  { label: 'Impact calculation', icon: '📊' },
  { label: 'Generating insights', icon: '🧠' },
  { label: 'Drafting authority alert', icon: '📨' },
  { label: 'Analysis complete!', icon: '✅' },
]

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  MEDIUM:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  LOW:      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
}

export default function ReportIssue() {
  const navigate = useNavigate()
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [context, setContext] = useState('')
  const [reporterName, setReporterName] = useState(localStorage.getItem('reporterName') || '')
  const [issueAddress, setIssueAddress] = useState('')
  const [userLat, setUserLat] = useState('')
  const [userLng, setUserLng] = useState('')
  const addressManuallyEdited = useRef(false)
  const geocodeRequestRef = useRef(0)
  const { position, loading: gettingLocation, startWatching, stopWatching, isWatching, error: geoError } = useGeolocation()
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [analysisSteps, setAnalysisSteps] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [reportedAt, setReportedAt] = useState(null)
  const [dragging, setDragging] = useState(false)

  const analyzingRef = useRef(false)
  const savedIdRef = useRef(null)
  const { listening, supported: voiceSupported, startListening, stopListening } = useVoice(
    (transcript) => setContext(prev => (prev ? prev + ' ' + transcript : transcript).slice(0, 500))
  )
  const fileInputRef = useRef(null)
  const resultRef = useRef(null)

  // --- Live Camera State ---
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraMode, setCameraMode] = useState('photo') // 'photo' | 'video'
  const [recording, setRecording] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // rear cam default
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: cameraMode === 'video',
      })
      streamRef.current = stream
      setCameraOpen(true)
      // videoRef gets attached after modal renders — set via useEffect below
    } catch (err) {
      toast.error('Camera access denied. Please allow camera permission.')
    }
  }

  // Attach stream to video element once the modal is open and videoRef exists
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraOpen])

  async function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: cameraMode === 'video',
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {}
  }

  function closeCamera() {
    if (recording) stopRecording()
    stopStream()
    setCameraOpen(false)
    setRecording(false)
    chunksRef.current = []
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
      resetImage()
      setImage(URL.createObjectURL(file))
      setImageFile(file)
      closeCamera()
      toast.success('Photo captured!')
    }, 'image/jpeg', 0.92)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const mr = new MediaRecorder(streamRef.current, { mimeType })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      if (blob.size > 20 * 1024 * 1024) {
        toast.error('Recording too large. Keep it under 20MB.')
        return
      }
      const file = new File([blob], `recording_${Date.now()}.webm`, { type: mimeType })
      resetImage()
      setImage(URL.createObjectURL(file))
      setImageFile(file)
      closeCamera()
      toast.success('Video captured!')
    }
    mr.start()
    mediaRecorderRef.current = mr
    setRecording(true)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  // Stop stream when component unmounts
  useEffect(() => () => stopStream(), [stopStream])

  // Animate steps during analysis
  useEffect(() => {
    if (!analyzing) { setAnalysisSteps([]); return }
    setAnalysisSteps([])
    const intervals = [400, 900, 1500, 2200, 3000, 3800, 4500, 5000]
    const timers = intervals.map((delay, i) =>
      setTimeout(() => setAnalysisSteps(prev => [...prev, AI_STEPS[i]]), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [analyzing])

  // Countdown redirect
  useEffect(() => {
    if (result?._savedId && countdown === null) setCountdown(5)
  }, [result])

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) { navigate(`/issues/${savedIdRef.current}`); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function resetImage() {
    setImage(null); setImageFile(null); setResult(null); setCountdown(null); setReportedAt(null)
    savedIdRef.current = null
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    resetImage()
    setImage(URL.createObjectURL(file))
    setImageFile(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      resetImage()
      setImage(URL.createObjectURL(file))
      setImageFile(file)
    } else {
      toast.error('Only image files are allowed')
    }
  }

  // Sync live GPS to form fields and auto-fill address
  useEffect(() => {
    if (!position) return
    setUserLat(position.lat.toFixed(6))
    setUserLng(position.lng.toFixed(6))

    if (addressManuallyEdited.current) return
    const requestId = ++geocodeRequestRef.current
    reverseGeocode(position.lat, position.lng).then(addr => {
      if (requestId !== geocodeRequestRef.current || addressManuallyEdited.current || !addr) return
      setIssueAddress(addr.slice(0, 300))
    }).catch(() => {})
  }, [position])

  useEffect(() => {
    if (geoError) toast.error(geolocationErrorMessage(geoError), { duration: 5000 })
  }, [geoError])

  function toggleLiveLocation() {
    if (isWatching) {
      stopWatching()
      toast('Location tracking stopped')
      return
    }
    startWatching()
    toast.success('Tracking your live location — move to update pin')
  }

  function clearLocation() {
    stopWatching()
    setUserLat('')
    setUserLng('')
    if (!addressManuallyEdited.current) setIssueAddress('')
  }

  async function handleAnalyze() {
    if (!imageFile) return toast.error('Please upload an image first')
    if (analyzingRef.current) return
    const isVideo = imageFile.type.startsWith('video/')
    const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(imageFile.type)
    if (!isImage && !isVideo) {
      return toast.error('Invalid file type. Only images (JPG/PNG/WebP) or videos (MP4/MOV) allowed.')
    }
    if (!isVideo && imageFile.size > 2 * 1024 * 1024) {
      return toast.error('Image too large. Please use an image under 2MB.')
    }
    if (isVideo && imageFile.size > 20 * 1024 * 1024) {
      return toast.error('Video too large. Please use a video under 20MB.')
    }

    analyzingRef.current = true
    setAnalyzing(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('userContext', context)
      formData.append('reporterName', reporterName || 'Anonymous')
      if (reporterName) localStorage.setItem('reporterName', reporterName)
      if (userLat) formData.append('userLat', userLat)
      if (userLng) formData.append('userLng', userLng)
      if (issueAddress.trim()) formData.append('issueAddress', issueAddress.trim())
      const sid = localStorage.getItem('session') || 'anon'
      formData.append('sessionId', sid)

      const { data } = await analyzeAPI.analyze(formData)
      setResult(data)
      if (data._savedId) {
        savedIdRef.current = data._savedId
        setReportedAt(new Date().toISOString())
      }
      toast.success('Analysis complete! 🤖', { icon: '✅' })
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      if (!err.response) toast.error(err.message || 'Network error. Check your connection.', { duration: 5000 })
      else if (err.response.status === 429) toast.error(err.response.data?.error || 'Please wait before trying again.', { duration: 5000 })
      else if (err.response.status === 400) toast.error(err.response.data?.error || 'Invalid image. Please try another.', { duration: 4000 })
      else toast.error(err.response?.data?.error || 'Analysis failed. Please try again.', { duration: 5000 })
    } finally {
      setAnalyzing(false)
      analyzingRef.current = false
    }
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => fallbackCopy(text))
    } else { fallbackCopy(text) }
  }
  function fallbackCopy(text) {
    const el = document.createElement('textarea'); el.value = text
    document.body.appendChild(el); el.select()
    try { document.execCommand('copy'); toast.success('Copied!') } catch { toast.error('Copy failed') }
    document.body.removeChild(el)
  }

  const analysis = result?.analysis
  const sev = analysis ? SEVERITY_CONFIG[analysis.severity_assessment?.severity_level] : null

  return (
    <>
    <div className="bg-white min-h-full">
      <div className="page-header">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-[#1e40af] uppercase tracking-widest mb-1">Citizen Services</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Report a Public Issue</h1>
          <p className="text-slate-600 text-sm">Upload a photo of the problem — AI will classify severity and notify authorities automatically.</p>
        </div>
      </div>
    <div className="max-w-2xl mx-auto px-4 py-5 pb-10">

      {/* Step 1 — Photo / Video Capture */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-[#1e40af] rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">1</div>
          <p className="font-semibold text-slate-900 text-sm">Take or Upload a Photo / Video</p>
        </div>

        {!image ? (
          <>
            {/* Upload drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all touch-manipulation mb-3
                ${dragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}
            >
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                {dragging
                  ? <Upload className="w-7 h-7 text-emerald-700 animate-bounce" />
                  : <Camera className="w-7 h-7 text-emerald-700" />}
              </div>
              <p className="text-slate-900 font-semibold mb-1">
                {dragging ? '📸 Drop here!' : 'Tap to upload file'}
              </p>
              <p className="text-slate-500 text-xs">
                {dragging ? 'Release to upload' : 'or drag & drop here'}
              </p>
              <p className="text-slate-500 text-xs mt-2"> Images (JPG/PNG ≤2MB) · Videos (MP4/MOV ≤20MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Live Camera buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setCameraMode('photo'); openCamera() }}
                className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 font-medium py-3 rounded-xl border border-emerald-500/20 transition-all touch-manipulation text-sm"
              >
                <Camera className="w-4 h-4" /> Take Photo
              </button>
              <button
                type="button"
                onClick={() => { setCameraMode('video'); openCamera() }}
                className="flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 font-medium py-3 rounded-xl border border-orange-500/20 transition-all touch-manipulation text-sm"
              >
                <Video className="w-4 h-4" /> Upload Video
              </button>
            </div>
          </>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-slate-50 shadow-sm">
            {imageFile?.type?.startsWith('video/')
              ? <video src={image} controls className="w-full max-h-64 object-cover rounded-xl" />
              : <img src={image} alt="Preview" className="w-full max-h-64 object-cover" />
            }
            <button
              onClick={resetImage}
              className="absolute top-2 right-2 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center touch-manipulation"
            >
              <X className="w-4 h-4 text-slate-900" />
            </button>
            <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm text-emerald-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Photo ready
            </div>
          </div>
        )}
      </div>

      {/* Step 2 — Details */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-emerald-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">2</div>
          <p className="font-semibold text-slate-900 text-sm">Add Details <span className="text-slate-500 font-normal">(optional)</span></p>
        </div>

        {/* Reporter Name */}
        <div className="mb-3">
          <label className="text-xs text-slate-500 mb-1.5 block">Your Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={reporterName}
              onChange={e => setReporterName(e.target.value.slice(0, 50))}
              placeholder="Anonymous"
              className="input-field pl-9"
            />
          </div>
        </div>

        {/* Context */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-500">Describe the issue</label>
            {voiceSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all touch-manipulation ${listening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}
              >
                {listening
                  ? <><MicOff className="w-3 h-3" /> Stop</>
                  : <><Mic className="w-3 h-3" /> Voice</>
                }
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              rows={2}
              placeholder="e.g. Large pothole on MG Road near the hospital entrance"
              value={context}
              onChange={e => setContext(e.target.value.slice(0, 500))}
              className="input-field resize-none"
            />
            <span className={`absolute bottom-2.5 right-3 text-xs ${context.length > 450 ? 'text-red-400' : 'text-slate-500'}`}>
              {context.length}/500
            </span>
          </div>
        </div>

        {/* Issue Address */}
        <div className="mb-3">
          <label className="text-xs text-slate-500 mb-1.5 block">Issue Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={issueAddress}
              onChange={e => {
                addressManuallyEdited.current = true
                setIssueAddress(e.target.value.slice(0, 300))
              }}
              placeholder="e.g. Main Chowk, near Hospital, your city"
              className="input-field pl-9"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isWatching
              ? 'Address auto-fills from your live location — edit if needed'
              : 'Type the street or landmark, or use live GPS below to auto-detect'}
          </p>
        </div>

        {/* GPS */}
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Live GPS Location</label>
          <div className="flex gap-2">
            <button
              onClick={toggleLiveLocation}
              disabled={gettingLocation && !userLat}
              className={`btn-secondary flex-1 justify-center text-sm ${isWatching ? 'border-emerald-500/50 text-emerald-700' : ''}`}
            >
              {gettingLocation && !userLat
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Getting location...</>
                : <><MapPin className="w-4 h-4 text-emerald-700" /> {isWatching ? 'Tracking Live Location' : userLat ? 'Update Live Location' : 'Track Live Location'}</>
              }
            </button>
            {userLat && (
              <button
                onClick={clearLocation}
                className="btn-secondary px-3 text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {userLat && (
            <p className="text-xs text-green-500 flex items-center gap-1 mt-2 px-1">
              <CheckCircle className="w-3 h-3" />
              {isWatching ? 'Live' : 'Fixed'} GPS: {userLat}, {userLng}
              {position?.accuracy ? ` (±${Math.round(position.accuracy)}m)` : ''}
            </p>
          )}

          {userLat && userLng && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location Preview
              </p>
              <LocationPreview lat={userLat} lng={userLng} />
            </div>
          )}
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!imageFile || analyzing}
        className="btn-primary w-full justify-center text-base py-4 mb-4 min-h-[56px] shadow-lg shadow-emerald-500/20"
      >
        {analyzing
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing with Gemini AI...</>
          : <><Brain className="w-5 h-5" /> Analyze with AI</>
        }
      </button>

      {/* AI Steps */}
      {analyzing && analysisSteps.length > 0 && (
        <div className="card p-4 mb-4 border-emerald-500/20 border fade-in">
          <p className="text-xs font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <Brain className="w-3 h-3" /> Gemini AI Agent Processing
          </p>
          <div className="flex flex-col gap-2">
            {AI_STEPS.map((step, i) => {
              const done = i < analysisSteps.length
              const active = i === analysisSteps.length - 1
              return (
                <div key={i} className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${done ? 'opacity-100' : 'opacity-20'}`}>
                  <span className="text-base flex-shrink-0">{done ? '✅' : step.icon}</span>
                  <span className={done ? 'text-slate-400' : 'text-slate-600'}>{step.label}</span>
                  {active && <Loader2 className="w-3 h-3 animate-spin text-emerald-700 ml-auto flex-shrink-0" />}
                </div>
              )
            })}
          </div>
          <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(analysisSteps.length / AI_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {result && analysis && !analyzing && (
        <div ref={resultRef} className="flex flex-col gap-4 fade-in">

          {/* Issue Not Found */}
          {!analysis.issue_detection?.issue_found && (
            <div className="card p-5 text-center border-yellow-500/20 border">
              <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-900 mb-1">No Issue Detected</p>
              <p className="text-sm text-slate-500">{analysis.visual_analysis?.description || 'The AI could not find a clear infrastructure issue. Try a clearer photo.'}</p>
            </div>
          )}

          {/* Issue Found */}
          {analysis.issue_detection?.issue_found && (
            <>
              {/* Main Result Card */}
              <div className={`card p-4 border ${sev?.border || 'border-emerald-500/20'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${sev?.color} ${sev?.bg} ${sev?.border} border`}>
                        {analysis.severity_assessment?.severity_level}
                      </span>
                      <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        {analysis.issue_detection?.issue_type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      🤖 {Math.round((analysis.issue_detection?.type_confidence || 0) * 100)}% confidence
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">Affects</p>
                    <p className="text-lg font-bold text-orange-400">
                      {analysis.impact_assessment?.estimated_affected_people?.toLocaleString() || '?'}
                    </p>
                    <p className="text-xs text-slate-600">people</p>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  {analysis.severity_assessment?.reasoning}
                </p>

                {analysis.location_information?.area_description && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-2">
                    <MapPin className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                    {analysis.location_information.area_description}
                  </p>
                )}
              </div>

              {/* Resolution */}
              <div className="card p-4">
                <p className="section-title"><Zap className="w-4 h-4 text-yellow-400" /> Resolution Plan</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Authority', value: analysis.resolution_guidance?.required_authority?.replace(/_/g, ' ') || '—' },
                    { label: 'Fix Time', value: analysis.resolution_guidance?.estimated_fix_days ? `${analysis.resolution_guidance.estimated_fix_days}d` : '—' },
                    { label: 'Est. Cost', value: analysis.resolution_guidance?.estimated_cost_inr ? `₹${(analysis.resolution_guidance.estimated_cost_inr / 1000).toFixed(0)}k` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-100 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                      <p className="text-xs font-semibold text-slate-900 leading-tight">{value}</p>
                    </div>
                  ))}
                </div>
                {analysis.proactive_insights?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {analysis.proactive_insights.slice(0, 3).map((ins, i) => (
                    <p key={i} className="text-xs text-slate-700 flex gap-2 bg-slate-100 rounded-lg px-3 py-2">
                        <span className="text-orange-400 flex-shrink-0">→</span>{ins}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-Alert for CRITICAL */}
              {result.autoAlert && (
                <div className="card p-4 border border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                    <p className="text-sm font-bold text-red-400">🤖 Agent Action: Auto-Alert Generated</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-red-500/20">
                    <p className="text-xs text-slate-500 mb-2 font-medium">📨 Draft Alert:</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{result.autoAlert.draft_message}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.autoAlert.escalation_path.map((step, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-xs bg-red-500/10 text-red-300 px-2.5 py-1 rounded-full border border-red-500/20">{step}</span>
                        {i < result.autoAlert.escalation_path.length - 1 && <ChevronRight className="w-3 h-3 text-slate-500" />}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Response SLA: <span className="text-red-400 font-bold">{result.autoAlert.sla}</span>
                  </p>
                  <button
                    onClick={() => copyText(result.autoAlert.draft_message)}
                    className="btn-secondary w-full justify-center text-xs py-2.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Alert Message
                  </button>
                </div>
              )}

              {/* Success / Redirect */}
              {result._savedId && (
                <div className="card p-5 text-center border-green-500/20 border">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-900 mb-1">Issue Reported Successfully!</p>
                  {reportedAt && (
                    <p className="text-sm text-slate-600 mb-2">
                      Reported on <span className="font-semibold text-slate-800">{formatReportDateTime(reportedAt)}</span>
                    </p>
                  )}
                  <p className="text-slate-500 text-sm mb-4">
                    Redirecting in <span className="text-slate-900 font-bold">{countdown}s</span>...
                  </p>
                  <button
                    onClick={() => navigate(`/issues/${savedIdRef.current || result._savedId}`)}
                    className="btn-primary w-full justify-center"
                  >
                    <CheckCircle className="w-4 h-4" /> View Issue Now
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
    </div>

      {/* ── Live Camera Modal ── */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200">
            <button onClick={closeCamera} className="text-slate-900 flex items-center gap-2 text-sm">
              <X className="w-5 h-5" /> Close
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCameraMode(m => m === 'photo' ? 'video' : 'photo')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  cameraMode === 'photo'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-orange-700 text-white'
                }`}
              >
                {cameraMode === 'photo' ? '📷 Photo' : '🎥 Video'}
              </button>
            </div>
            <button
              onClick={flipCamera}
              className="text-slate-900 flex items-center gap-1 text-sm bg-slate-100 px-3 py-1.5 rounded-full"
            >
              <FlipHorizontal className="w-4 h-4" /> Flip
            </button>
          </div>

          {/* Camera Feed */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {recording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/90 text-white text-sm px-4 py-2 rounded-full animate-pulse">
                <StopCircle className="w-4 h-4" /> Recording...
              </div>
            )}
          </div>

          {/* Capture Controls */}
          <div className="flex items-center justify-center gap-6 px-6 py-6 bg-slate-100/95 backdrop-blur-sm">
            {cameraMode === 'photo' ? (
              <button
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
              >
                <Camera className="w-9 h-9 text-slate-900" />
              </button>
            ) : (
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all ${
                  recording
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-white'
                }`}
              >
                {recording
                  ? <StopCircle className="w-9 h-9 text-white" />
                  : <Video className="w-9 h-9 text-slate-900" />
                }
              </button>
            )}
          </div>

          {cameraMode === 'video' && !recording && (
            <p className="text-center text-slate-500 text-xs pb-4">Tap the button to start recording</p>
          )}
        </div>
      )}
    </>
  )
}

