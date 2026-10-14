import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

const HIGH_CUE_TRIGGER = 0.52;
const REQUIRED_HIGH_READINGS = 3;
const LOW_READINGS_TO_REARM = 3

export default function CVMonitor({ onHighCue, paused = false }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const busyRef = useRef(false)
  const highReadingsRef = useRef(0)
  const lowReadingsRef = useRef(0)
  const armedRef = useRef(true)
  const onHighCueRef = useRef(onHighCue)
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('Camera is off. Camera use is optional.')
  const [modelReady, setModelReady] = useState(false)
  const [latest, setLatest] = useState(null)

  useEffect(() => { onHighCueRef.current = onHighCue }, [onHighCue])

  useEffect(() => {
    api.get('/cv/status').then(s => {
      setModelReady(Boolean(s.model_ready))
      if (!s.model_ready) setStatus('CV connected, but the model checkpoint is not ready. Learning practice still works normally.')
    }).catch(() => setStatus('CV API is unavailable. Learning practice still works normally.'))
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera requires localhost or HTTPS in a supported browser.')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setActive(true)
      setStatus('Camera active. Optional facial cues are used only to offer learning pauses, not to diagnose stress.')
    } catch (e) { setStatus(e.message || 'Could not access camera. Check browser permission.') }
  }

  function stopCamera() {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  useEffect(() => {
    if (!active) return
    const timer = setInterval(async () => {
      if (busyRef.current || !videoRef.current || videoRef.current.readyState < 2) return
      busyRef.current = true
      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = 320
        canvas.height = Math.round(320 * video.videoHeight / Math.max(1, video.videoWidth))
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
        const result = await api.post('/cv/frame', { image: canvas.toDataURL('image/jpeg', 0.65) })
        setLatest(result)
        setStatus(!result.face_detected
          ? 'No face detected. Adjust lighting or camera position.'
          : `Face detected · ${result.frames_collected}/16 frames collected.`)

        const probability = Number(result.facial_cue_probability)
        if (!paused && modelReady && result.face_detected && result.sequence_ready && Number.isFinite(probability)) {
          if (probability >= HIGH_CUE_TRIGGER) {
            highReadingsRef.current += 1
            lowReadingsRef.current = 0
            if (armedRef.current && highReadingsRef.current >= REQUIRED_HIGH_READINGS) {
              armedRef.current = false
              highReadingsRef.current = 0
              onHighCueRef.current?.()
            }
          } else {
            highReadingsRef.current = 0
            lowReadingsRef.current += 1
            if (lowReadingsRef.current >= LOW_READINGS_TO_REARM) {
              armedRef.current = true
              lowReadingsRef.current = 0
            }
          }
        }
      } catch (e) { setStatus(`CV frame unavailable: ${e.message}`) } finally { busyRef.current = false }
    }, 1200)
    return () => clearInterval(timer)
  }, [active, modelReady, paused])

  return <div className="monitor-placeholder cv-monitor" style={{ display: 'grid', gap: 10 }}>
    <strong>Optional camera learning cues</strong>
    <p style={{ margin: 0 }}>{status}</p>
    <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: 190, borderRadius: 10, background: '#111', display: active ? 'block' : 'none' }} />
    <canvas ref={canvasRef} style={{ display: 'none' }} />
    {!active ? <button className="secondary-button" onClick={startCamera}>Enable camera</button> : <button className="secondary-button" onClick={stopCamera}>Turn camera off</button>}
    {latest && <small>{latest.face_detected ? 'Face detected' : 'Waiting for face'} · {latest.frames_collected}/16 frames{latest.sequence_ready ? ' · Learning support active' : ''}</small>}
    <small>Numerical cue scores are hidden. Camera stays off until enabled; frames are processed by the local API and are not stored by this feature.</small>
  </div>
}
