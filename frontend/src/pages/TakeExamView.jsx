import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import TakeExamHeader from '../components/exam/TakeExamHeader'
import QuestionCard from '../components/exam/QuestionCard'
import RecorderPanel from '../components/exam/RecorderPanel'
import QuestionNavigator from '../components/exam/QuestionNavigator'
import ActionBar from '../components/exam/ActionBar'
import { getExamSummary, fetchExamQuestions, submitExam } from '../services/api'
import { useCountdown } from '../hooks/useCountdown'

/**
 * TakeExamView - Page for students to take an exam
 */
export default function TakeExamView() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [examSummary, setExamSummary] = useState(null)
  const [questions, setQuestions] = useState([])
  
  const [mediaAnswers, setMediaAnswers] = useState({})
  const [recording, setRecording] = useState(false)
  const [recorder, setRecorder] = useState(null)
  const [stream, setStream] = useState(null)
  const [chunks, setChunks] = useState([])
  const [reRecords, setReRecords] = useState({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [startTime] = useState(new Date())
  const [attemptId] = useState(location.state?.attemptId || `ATT-${Date.now()}`)

  // Load exam data
  useEffect(() => {
    const loadExam = async () => {
      try {
        const [summary, questionsData] = await Promise.all([
          getExamSummary(examId),
          fetchExamQuestions(examId)
        ])
        setExamSummary(summary)
        const loadedQuestions = questionsData.questions || []
        console.log('Loaded questions:', loadedQuestions.length, 'questions')
        console.log('Question types:', loadedQuestions.map(q => ({ id: q.id, type: q.type, hasOptions: !!q.options })))
        
        // Ensure all questions are properly formatted
        const formattedQuestions = loadedQuestions.map((q, index) => ({
          id: q.id || `Q${index + 1}`,
          type: q.type || 'viva',
          question: q.question || '',
          points: q.points || 1,
          media: q.media || null
        }))
        
        setQuestions(formattedQuestions)
      } catch (err) {
        console.error('Error loading exam:', err)
        setError(err?.message || 'Failed to load exam')
      } finally {
        setLoading(false)
      }
    }
    loadExam()
  }, [examId])

  // Timer for exam duration
  const examEndTime = examSummary 
    ? new Date(new Date(startTime).getTime() + (examSummary.durationMin * 60 * 1000))
    : null

  const { formatted: timeRemaining, expired: timeExpired } = useCountdown(
    examEndTime?.toISOString(),
    () => {
      // Auto-submit when time expires
      if (!submitting) {
        handleSubmit()
      }
    }
  )

  

  const startCamera = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(media)
      const mr = new MediaRecorder(media)
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          setChunks(prev => [...prev, e.data])
        }
      }
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const qid = questions[currentQuestionIndex]?.id
          if (qid) {
            setMediaAnswers(prev => ({ ...prev, [qid]: reader.result }))
          }
          setChunks([])
        }
        reader.readAsDataURL(blob)
      }
      setRecorder(mr)
    } catch (err) {
      setError(err?.message || 'Failed to access camera/microphone')
    }
  }

  const startRecording = () => {
    if (!recorder) return
    setRecording(true)
    recorder.start()
    const seconds = examSummary?.timePerQuestionSec
    if (seconds && seconds > 0) {
      setTimeout(() => {
        stopRecording()
      }, seconds * 1000)
    }
  }

  const stopRecording = () => {
    if (!recorder) return
    setRecording(false)
    recorder.stop()
  }

  const discardRecording = () => {
    const qid = questions[currentQuestionIndex]?.id
    if (!qid) return
    const used = reRecords[qid] || 0
    const limit = examSummary?.allowedReRecords || 0
    if (used >= limit) {
      alert('Re-record limit reached')
      return
    }
    setMediaAnswers(prev => ({ ...prev, [qid]: undefined }))
    setReRecords(prev => ({ ...prev, [qid]: used + 1 }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    if (submitting) return

    const unanswered = questions.filter(q => {
      const v = mediaAnswers[q.id]
      return v == null || v === ''
    })
    if (unanswered.length > 0 && !confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) {
      return
    }

    setSubmitting(true)
    try {
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000 / 60) // minutes
      const result = await submitExam(examId, {
        answers: {},
        attemptId,
        startedAt: startTime.toISOString(),
        timeSpent,
        studentId: 'STU001',
        mediaAnswers
      })

      // Navigate to results
      navigate(`/student/exams/${examId}/results`, {
        state: {
          score: result.score,
          maxScore: result.maxScore,
          percentage: result.percentage,
          submissionId: result.submissionId
        }
      })
    } catch (err) {
      setError(err?.message || 'Failed to submit exam')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading exam...</div>
      </div>
    )
  }

  if (error || !examSummary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Exam not found'}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const answeredCount = Object.keys(mediaAnswers).filter(key => {
    const v = mediaAnswers[key]
    return v != null && v !== ''
  }).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TakeExamHeader
        title={examSummary.title}
        currentIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        timeRemaining={timeRemaining}
        timeExpired={timeExpired}
        answeredCount={answeredCount}
        totalPoints={questions.reduce((sum, q) => sum + (q.points || 1), 0)}
        onBack={() => navigate('/student/available')}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No questions available for this exam.</p>
          </div>
        ) : currentQuestion ? (
          <>
            <QuestionCard question={currentQuestion} index={currentQuestionIndex} total={questions.length} />
            <RecorderPanel
              stream={stream}
              recording={recording}
              hasRecording={Boolean(mediaAnswers[currentQuestion.id])}
              startCamera={startCamera}
              startRecording={startRecording}
              stopRecording={stopRecording}
              discardRecording={discardRecording}
              reRecordUsed={reRecords[currentQuestion.id] || 0}
              reRecordLimit={examSummary?.allowedReRecords || 0}
              previewSrc={mediaAnswers[currentQuestion.id]}
            />
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Question not found.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <QuestionNavigator
            questions={questions}
            currentIndex={currentQuestionIndex}
            mediaAnswers={mediaAnswers}
            onSelect={setCurrentQuestionIndex}
            answeredCount={answeredCount}
          />

          <ActionBar
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSubmit={handleSubmit}
            disablePrevious={currentQuestionIndex === 0}
            isLast={currentQuestionIndex === questions.length - 1}
            submitting={submitting}
            timeExpired={timeExpired}
            currentIndex={currentQuestionIndex}
            total={questions.length}
          />
        </div>
      </div>
    </div>
  )
}
