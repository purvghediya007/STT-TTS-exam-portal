import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { fetchAPI, API_BASE_URL } from '../services/api'
import ExamChart from './ExamChart'
import TypeChart from './TypeChart'
import FeedbackCards from './FeedbackCards'
// Resolve an uploads path to the proper API/proxy-hosted URL
function resolveUploadUrl(raw) {
  if (!raw) return raw
  // absolute URL -> return as-is
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const ensureLeading = (s) => (s && s.startsWith('/') ? s : `/${s}`)
  const rel = ensureLeading(raw || '')

  // Dev: when API_BASE_URL is the proxy path (`/api`) the frontend runs on Vite (5173)
  // and the backend runs on a different port (3001). Build an absolute URL that points
  // to the backend origin so direct requests (and downloads) go to the correct server.
  if (API_BASE_URL === '/api' || API_BASE_URL === '/api/') {
    // Prefer an explicit env override if provided
    const devHost = import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_API_BASE_URL || null
    if (devHost && (devHost.startsWith('http://') || devHost.startsWith('https://'))) {
      return `${devHost.replace(/\/$/, '')}${rel}`
    }

    // Fallback: assume backend is on the same host but port 3001 (common local setup)
    const loc = window.location
    const hostname = loc.hostname || 'localhost'
    const backendPort = import.meta.env.VITE_API_PORT || '3001'
    return `${loc.protocol}//${hostname}:${backendPort}${rel}`
  }

  try {
    const base = new URL(API_BASE_URL, window.location.href)
    const rootPath = base.pathname.replace(/\/api\/?$/, '')
    const host = `${base.origin}${rootPath === '/' ? '' : rootPath}`
    return `${host}${rel}`
  } catch (e) {
    return `${API_BASE_URL.replace(/\/$/, '')}${rel}`
  }
}

export default function ExamAnalysis({ examId, attemptId: propAttemptId, initialExam, initialPercentage }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [activeType, setActiveType] = useState(null)

  function AudioPlayerButton({ src }) {
    const [playing, setPlaying] = useState(false)
    const [error, setError] = useState(null)
    const [loadingAudio, setLoadingAudio] = useState(false)
    const [current, setCurrent] = useState(0)
    const [duration, setDuration] = useState(0)
    const audioRef = React.useRef(null)
    const rafRef = React.useRef(null)
    const [resolvedSrc, setResolvedSrc] = useState(null)

    useEffect(() => {
      let mounted = true
      const probe = async () => {
        setError(null)
        setLoadingAudio(true)
        try {
          const url = resolveUploadUrl(src)
          const audioTest = document.createElement('audio')

          // 1) Try HEAD to get content-type quickly
          try {
            const h = await fetch(url, { method: 'HEAD' })
            if (h && h.ok) {
              const ct = (h.headers.get('content-type') || '').toLowerCase()
              // If server reports an audio type and the browser can play it, use the URL directly
              if (ct.startsWith('audio/')) {
                if (audioTest.canPlayType(ct)) {
                  if (mounted) setResolvedSrc(url)
                  return
                }
                // try common server-side fallback (mp3) if browser doesn't support reported type
                const alt = url.replace(/\.(webm|ogg|m4a|wav)$/i, '.mp3')
                try {
                  const ah = await fetch(alt, { method: 'HEAD' })
                  if (ah && ah.ok) {
                    if (mounted) setResolvedSrc(alt)
                    return
                  }
                } catch (_) {}
              }
            }
          } catch (e) {
            // HEAD might fail on some hosts — continue to GET
          }

          // 2) Try GET and inspect blob (works when content-type header is missing)
          try {
            const r = await fetch(url)
            if (r && r.ok) {
              const blob = await r.blob()
              const blobType = (blob.type || '').toLowerCase()

              // If the browser can play the reported blob type, use a blob URL
              if (blobType && audioTest.canPlayType(blobType)) {
                const blobUrl = URL.createObjectURL(blob)
                if (mounted) setResolvedSrc(blobUrl)
                return
              }

              // If server sent an audio/* type but browser doesn't support it, try an .mp3 sibling
              if (blobType.startsWith('audio/')) {
                const alt = url.replace(/\.(webm|ogg|m4a|wav)$/i, '.mp3')
                try {
                  const ah = await fetch(alt, { method: 'HEAD' })
                  if (ah && ah.ok) {
                    if (mounted) setResolvedSrc(alt)
                    return
                  }
                } catch (_) {}
              }

              // Last resort: still expose the blob so the user can download it (some players accept blobs even if type is unknown)
              const blobUrl = URL.createObjectURL(blob)
              if (mounted) setResolvedSrc(blobUrl)
              return
            }
          } catch (e) {
            console.warn('audio probe GET failed', e)
          }

          // 3) Try an .mp3 alternative (useful if backend stores a converted mp3 alongside original)
          try {
            const alt = url.replace(/\.(webm|ogg|m4a|wav)$/i, '.mp3')
            const r2 = await fetch(alt, { method: 'HEAD' })
            if (r2 && r2.ok) {
              if (mounted) setResolvedSrc(alt)
              return
            }
          } catch (_) {}

          if (mounted) setError('Audio not available or not supported by your browser')
        } finally {
          if (mounted) setLoadingAudio(false)
        }
      }
      probe()
      return () => { mounted = false }
    }, [src])

    useEffect(() => {
      const a = audioRef.current
      if (!a) return
      const onLoaded = () => setDuration(a.duration || 0)
      const onEnded = () => setPlaying(false)
      a.addEventListener('loadedmetadata', onLoaded)
      a.addEventListener('ended', onEnded)
      return () => {
        a.removeEventListener('loadedmetadata', onLoaded)
        a.removeEventListener('ended', onEnded)
      }
    }, [resolvedSrc])

    useEffect(() => {
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        if (resolvedSrc && resolvedSrc.startsWith('blob:')) URL.revokeObjectURL(resolvedSrc)
      }
    }, [resolvedSrc])

    const toggle = async () => {
      setError(null)
      const a = audioRef.current
      if (!resolvedSrc) return setError('Audio not ready')
      if (!a) return setError('Audio element not available')

      try {
        if (playing) {
          a.pause()
          setPlaying(false)
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
        } else {
          if (a.src !== resolvedSrc) a.src = resolvedSrc
          try { a.load() } catch (_) {}
          await a.play()
          setPlaying(true)
          const loop = () => {
            setCurrent(a.currentTime || 0)
            rafRef.current = requestAnimationFrame(loop)
          }
          rafRef.current = requestAnimationFrame(loop)
        }
      } catch (err) {
        console.error('Playback error', err)
        setError(err?.name === 'NotSupportedError' ? 'Unsupported audio format or file not found.' : 'Unable to play audio. Please check file or server.')
        setPlaying(false)
      }
    }

    const onSeek = (e) => {
      const a = audioRef.current
      if (!a) return
      const val = parseFloat(e.target.value)
      a.currentTime = val
      setCurrent(val)
    }

    const fmt = (s = 0) => {
      if (!isFinite(s)) return '0:00'
      const m = Math.floor(s / 60)
      const sec = Math.floor(s % 60).toString().padStart(2, '0')
      return `${m}:${sec}`
    }

    // Fetch the audio and trigger a download. This avoids navigation to the dev server
    // root (Vite doesn't proxy /uploads) and works across origins if CORS allows it.
    const downloadAudio = async (ev) => {
      if (ev && ev.preventDefault) ev.preventDefault()
      setLoadingAudio(true)
      setError(null)
      try {
        const url = resolveUploadUrl(src)
        const fetchUrl = (resolvedSrc && resolvedSrc.startsWith('blob:')) ? resolvedSrc : url
        const res = await fetch(fetchUrl, { method: 'GET', credentials: 'include' })
        if (!res.ok) throw new Error(`Download failed (${res.status})`)
        const blob = await res.blob()
        const filename = (new URL(url, window.location.href).pathname.split('/').pop()) || 'answer_audio'
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
      } catch (err) {
        console.error('Download error', err)
        setError('Unable to download audio — check server or CORS settings')
      } finally {
        setLoadingAudio(false)
      }
    }

    return (
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-3">
          <button onClick={toggle} disabled={loadingAudio} className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100">
            <Play className={`w-4 h-4 ${playing ? 'transform rotate-90' : ''}`} />
          </button>
          <div className="flex-1">
            <input aria-label="seek" type="range" min={0} max={Math.max(0, duration)} step="0.01" value={current} onChange={onSeek} className="w-full" />
            <div className="text-xs text-gray-500 mt-1">{fmt(current)} / {fmt(duration)}</div>
          </div>
          {loadingAudio && <div className="text-sm text-gray-500 ml-2">Loading…</div>}
        </div>
        {error && (
          <div className="text-xs text-red-600 mt-1">
            {error}
            {/* provide direct-download fallback so user can still listen */}
            {src && (
              <div className="mt-2">
                <button onClick={downloadAudio} className="text-xs text-blue-600 underline">Download audio</button>
                <span className="ml-2 text-xs text-gray-500">or</span>
                <a className="ml-1 text-xs text-blue-600" href={resolveUploadUrl(src)} target="_blank" rel="noreferrer">Open raw</a>
                <div className="text-xs text-gray-500 mt-1">If playback fails, try Chrome/Firefox or ask your instructor to re-generate an MP3 copy.</div>
              </div>
            )}
          </div>
        )}

        {/* Only render audio element when we have a resolved source (avoid empty src which can trigger reloads) */}
        {resolvedSrc ? <audio ref={audioRef} src={resolvedSrc} preload="none" /> : null}
      </div>
    )
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        // If attemptId is provided, fetch detailed results
        const attemptId = propAttemptId
        if (attemptId) {
          const res = await fetchAPI(`/student/attempts/${attemptId}/results`)
          const json = await res.json()

          const questions = json.questions || []

          // Build type-wise aggregation for only the types present in this attempt
          const typeAgg = {}
          questions.forEach((q) => {
            const t = (q.type || 'other').toString().toLowerCase()
            if (!typeAgg[t]) typeAgg[t] = { score: 0, max: 0 }
            typeAgg[t].score += q.score || 0
            typeAgg[t].max += q.maxMarks || (q.marks || 0)
          })

          const typeWise = Object.keys(typeAgg).map((t) => ({ type: t, percentage: typeAgg[t].max ? Math.round((typeAgg[t].score / typeAgg[t].max) * 100) : 0 }))

          const examWise = [
            {
              examName: json.exam?.title || json.exam?.examCode || `Exam ${examId}`,
              percentage: json.attempt && json.attempt.totalScore && json.attempt.maxScore ? Math.round((json.attempt.totalScore / json.attempt.maxScore) * 100) : Math.round((initialPercentage || 0)),
            },
          ]

          const progress = [
            { date: json.attempt?.finishedAt || new Date().toISOString(), percentage: examWise[0].percentage },
          ]

          const aiFeedback = (questions.map((q) => q.feedback).filter(Boolean))

          if (mounted) setData({ exam: json.exam || initialExam || {}, attempt: json.attempt || null, typeWise, examWise, progress, aiFeedback, questions })
        } else if (initialExam) {
          // shallow view
          const exam = initialExam
          const examWise = [{ examName: exam.title || exam.id, percentage: initialPercentage ?? 0 }]
          if (mounted) setData({ exam, attempt: null, typeWise: [], examWise, progress: [], aiFeedback: ['No detailed attempt available.'], questions: [] })
        } else {
          setError('No exam or attempt data provided')
        }
      } catch (err) {
        console.error('ExamAnalysis load error', err)
        setError(err.message || JSON.stringify(err))
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [examId, propAttemptId, initialExam, initialPercentage])

  if (loading) return <div className="p-6">Loading analysis...</div>
  if (error) return (
    <div className="p-6 text-center">
      <div className="text-red-600 font-semibold">{String(error)}</div>
      <div className="mt-4">
        <button onClick={() => navigate('/student/history')} className="px-4 py-2 bg-blue-600 text-white rounded">Back to history</button>
      </div>
    </div>
  )

  if (!data) return null

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-blue-50">
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{data.exam.title || data.exam.examCode || 'Exam Analysis'}</h1>
            <div className="text-sm text-gray-500">Detailed breakdown and question-wise feedback</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-600">Score</div>
          <div className="text-xl font-bold text-blue-600">{data.examWise?.[0]?.percentage ?? 0}%</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Overall</div>
                <div className="text-3xl font-bold text-blue-600 mb-2">{data.examWise?.[0]?.percentage ?? 0}%</div>
                <ExamChart data={data.examWise} />
              </div>

              <div>
  
              </div>
            </div>
          </div>

          {/* Questions list */}
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Question-wise Analysis</h2>
            <div className="space-y-4">
              {((data.questions || []).filter(q => !activeType || (q.type || 'other') === activeType)).map((q, i) => (
                <div key={i} className="p-4 border border-blue-50 rounded-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-gray-700 font-medium">Q{i + 1}. {q.instruction || q.text}</div>
                      {/* audio playback: prefer recordingUrls, otherwise detect URLs in answerText */}
                      {(() => {
                        // Prefer local uploads path and do NOT show raw links.
                        const audioCandidates = []
                        if (q.recordingUrls && q.recordingUrls.length) {
                          q.recordingUrls.forEach(u => {
                            if (!u) return
                            const hasUploads = u.includes('/uploads/answers/') || u.includes('uploads/answers')
                            const looksLikeAudio = /\.(mp3|wav|ogg|m4a|webm)$/i.test(u)
                            if (hasUploads || looksLikeAudio) audioCandidates.push(u)
                          })
                        }
                        if (!audioCandidates.length && q.answerText) {
                          const m = q.answerText.match(/\/uploads\/answers\/[A-Za-z0-9_\-./]+/g) || []
                          if (m.length) audioCandidates.push(...m)
                        }

                        if (audioCandidates.length) {
                          // Prefer absolute URLs; otherwise route via proxy/backend
                          const raw = audioCandidates[0]
                          const src = raw.startsWith('http://') || raw.startsWith('https://') ? raw : resolveUploadUrl(raw)
                          return (
                            <div className="mt-3">
                              <AudioPlayerButton src={src} />
                            </div>
                          )
                        }

                        // fallback: show text answer only (no links)
                        return q.answerText ? <div className="text-sm text-gray-500 mt-2">Your answer: <span className="font-medium text-gray-700">{q.answerText}</span></div> : null
                      })()}
                      {typeof q.selectedOptionIndex !== 'undefined' && (
                        <div className="text-xs text-gray-500 mt-1">Selected option: {q.selectedOptionIndex}</div>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm text-gray-500">Score</div>
                      <div className="text-lg font-bold text-blue-700">{q.score ?? '-'} / {q.maxMarks ?? '-'}</div>
                    </div>
                  </div>

                  {q.feedback && (
                    <div className="mt-3 bg-blue-50 rounded p-3 text-sm text-gray-700">Feedback: {q.feedback}</div>
                  )}

                  {/* small progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-100 h-2 rounded-full">
                      <div style={{ width: `${q.maxMarks ? Math.round(((q.score || 0) / q.maxMarks) * 100) : 0}%` }} className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" />
                    </div>
                  </div>
                </div>
              ))}

              {(data.questions || []).length === 0 && (
                <div className="text-sm text-gray-500">No question level data available for this attempt.</div>
              )}
            </div>
          </div>
        </div>

        
      </div>
    </div>
  )
}
