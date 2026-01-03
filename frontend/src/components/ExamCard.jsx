import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  User,
  Award,
  Play,
  FileText,
  Calendar,
  Timer
} from 'lucide-react'
import { formatExamTimeRange, formatDuration, formatTimePerQuestion } from '../utils/format'
import { useCountdown } from '../hooks/useCountdown'
import StatusPill from './StatusPill'
import Badge from './Badge'
import JoinModal from './JoinModal'

export default function ExamCard({ exam, onPrefetch }) {
  const navigate = useNavigate()
  const [showJoinModal, setShowJoinModal] = useState(false)

  const { formatted: countdownFormatted, expired } = useCountdown(
    exam.endsAt,
    () => {}
  )

  const isLive = exam.status === 'live' && !expired

  const handleMouseEnter = () => {
    if (onPrefetch) {
      onPrefetch()
    }
  }

  const handleJoinClick = () => {
    setShowJoinModal(true)
  }

  const handleViewDetails = () => {
    if (onPrefetch) {
      onPrefetch()
    }
    navigate(`/student/exams/${exam.id}/details`)
  }

  const handleViewResults = () => {
    navigate(`/student/exams/${exam.id}/results`)
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <article
        className={`group relative bg-white rounded-xl border-[0.5px] border-blue-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5 focus-within:ring-1 focus-within:ring-blue-300 focus-within:ring-offset-1 ${isLive
            ? 'border-blue-400 shadow-sm shadow-blue-100/30 bg-white'
            : 'hover:border-blue-300 hover:bg-blue-50/20'
          }`}
        onMouseEnter={handleMouseEnter}
        aria-labelledby={`exam-title-${exam.id}`}
      >
        <div className={`h-0.5 w-full ${isLive 
          ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
          : exam.status === 'upcoming'
            ? 'bg-gradient-to-r from-sky-400 to-blue-400'
            : 'bg-gradient-to-r from-blue-400 to-cyan-400'
        }`}></div>

        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${isLive
                    ? 'bg-blue-50'
                    : exam.status === 'upcoming'
                      ? 'bg-sky-50'
                      : 'bg-blue-50'
                  }`}>
                  <FileText className={`w-5 h-5 ${isLive
                      ? 'text-blue-600'
                      : exam.status === 'upcoming'
                        ? 'text-sky-600'
                        : 'text-blue-600'
                    }`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    id={`exam-title-${exam.id}`}
                    className="text-lg md:text-xl font-bold text-gray-900 mb-1 leading-tight line-clamp-2"
                  >
                    {exam.title}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">ID: {exam.id}</p>
                </div>
              </div>
            </div>
            <StatusPill status={exam.status} pulse={isLive} />
          </div>

          {exam.shortDescription && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                {exam.shortDescription}
              </p>
            </div>
          )}

          <div className="mb-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border-[0.5px] border-blue-200">
              <div className="p-1.5 bg-blue-100 rounded-md flex-shrink-0">
                <Calendar className="w-4 h-4 text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Exam Schedule
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatExamTimeRange(exam.startsAt, exam.endsAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2 p-2.5 bg-sky-50 rounded-lg border-[0.5px] border-sky-200">
                <div className="p-1.5 bg-sky-100 rounded-md">
                  <Clock className="w-4 h-4 text-sky-600" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-medium">Duration</p>
                  <p className="text-sm font-bold text-gray-900">{formatDuration(exam.durationMin)}</p>
                </div>
              </div>
              {exam.timePerQuestionSec && (
                <div className="flex items-center gap-2 p-2.5 bg-cyan-50 rounded-lg border-[0.5px] border-cyan-200">
                  <div className="p-1.5 bg-cyan-100 rounded-md">
                    <Timer className="w-4 h-4 text-cyan-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium">Per Question</p>
                    <p className="text-sm font-bold text-gray-900">{formatTimePerQuestion(exam.timePerQuestionSec)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isLive && (
            <div className="mb-4 p-3 bg-blue-50 border-[0.5px] border-blue-200 rounded-lg">
              <div
                className="flex items-center gap-2 text-sm font-semibold text-blue-700"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </div>
                <span>Ends in {countdownFormatted}</span>
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {(() => {
              const attemptsLeft = exam.attemptsLeft ?? exam.attempts_left ?? exam.attemptsRemaining ?? exam.attempts_remaining ?? exam.attempts ?? exam.remainingAttempts ?? null
              if (attemptsLeft !== undefined && attemptsLeft !== null) {
                return (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${
                    attemptsLeft > 0 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    <span className="font-bold">{attemptsLeft}</span>
                    <span>{attemptsLeft === 1 ? 'attempt' : 'attempts'} {attemptsLeft > 0 ? 'left' : 'allowed'}</span>
                  </div>
                )
              }
              return null
            })()}

            {(() => {
              const allowedReRecords = exam.allowedReRecords ?? exam.allowed_re_records ?? exam.reRecordAllowed ?? exam.re_record_allowed ?? exam.allowedReRecordsCount ?? exam.reRecordsAllowed ?? null
              if (allowedReRecords !== undefined && allowedReRecords !== null) {
                return (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${
                    allowedReRecords > 0 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    <span className="font-bold">{allowedReRecords}</span>
                    <span>re-record{allowedReRecords !== 1 ? 's' : ''} allowed</span>
                  </div>
                )
              }
              return null
            })()}
          </div>

          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {getInitials(exam.teacherName)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700">{exam.teacherName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {exam.questions && exam.questions.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-md border-[0.5px] border-blue-200">
                    <FileText className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                    <span className="text-sm font-bold text-blue-700">{exam.questions.length}</span>
                    <span className="text-xs text-blue-600">Q</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-md border-[0.5px] border-amber-200">
                  <Award className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                  <span className="text-sm font-bold text-amber-700">{exam.pointsTotal}</span>
                  <span className="text-xs text-amber-600">pts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {exam.status === 'live' && (
              <button
                onClick={handleJoinClick}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-[0.98] flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm"
                aria-label={`Join exam: ${exam.title}`}
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                <span>Join now</span>
              </button>
            )}
            {exam.status === 'upcoming' && (
              <button
                onClick={handleViewDetails}
                className="w-full bg-blue-50 hover:bg-blue-100 border-[0.5px] border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-[0.98] text-sm"
                aria-label={`View details for exam: ${exam.title}`}
              >
                View details
              </button>
            )}
            {exam.status === 'finished' && (
              <button
                onClick={handleViewResults}
                className="w-full bg-gray-50 hover:bg-gray-100 border-[0.5px] border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 active:scale-[0.98] text-sm"
                aria-label={`View results for exam: ${exam.title}`}
              >
                View results
              </button>
            )}
          </div>
        </div>
      </article>

      {showJoinModal && (
        <JoinModal
          exam={exam}
          onClose={() => setShowJoinModal(false)}
          onSuccess={(attemptId) => {
            setShowJoinModal(false)
            navigate(`/student/exams/${exam.id}/take`, { state: { attemptId } })
          }}
        />
      )}
    </>
  )
}