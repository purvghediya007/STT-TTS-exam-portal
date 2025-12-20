/**
 * ExamCard component - displays exam information in a well-structured card layout
 */

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

/**
 * @param {Object} props
 * @param {import('../services/api').Exam} props.exam
 * @param {() => void} [props.onPrefetch]
 */
export default function ExamCard({ exam, onPrefetch }) {
  const navigate = useNavigate()
  const [showJoinModal, setShowJoinModal] = useState(false)

  const { formatted: countdownFormatted, expired } = useCountdown(
    exam.endsAt,
    () => {
      // Countdown expired - could refresh exam status
    }
  )

  const isLive = exam.status === 'live' && !expired

  // Trigger prefetch on hover
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
    // Navigate to exam details page to show full information
    navigate(`/student/exams/${exam.id}/details`)
  }

  const handleViewResults = () => {
    navigate(`/student/exams/${exam.id}/results`)
  }

  // Get teacher initials for avatar
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
        className={`group relative bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${isLive
            ? 'border-l-4 border-l-danger-dark shadow-md shadow-danger-dark/10'
            : 'border-slate-200 hover:border-primary-300'
          }`}
        onMouseEnter={handleMouseEnter}
        aria-labelledby={`exam-title-${exam.id}`}
      >
        {/* Live indicator gradient bar */}
        {isLive && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-danger-dark via-danger-dark/80 to-transparent"></div>
        )}

        <div className="p-5 md:p-6">
          {/* Header Section: Title, ID, and Status */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${isLive
                    ? 'bg-danger-light'
                    : exam.status === 'upcoming'
                      ? 'bg-primary-100'
                      : 'bg-slate-100'
                  }`}>
                  <FileText className={`w-5 h-5 ${isLive
                      ? 'text-danger-dark'
                      : exam.status === 'upcoming'
                        ? 'text-primary-600'
                        : 'text-slate-500'
                    }`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    id={`exam-title-${exam.id}`}
                    className="text-lg font-bold text-slate-900 mb-1.5 leading-tight line-clamp-2"
                  >
                    {exam.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500">ID: {exam.id}</p>
                </div>
              </div>
            </div>
            <StatusPill status={exam.status} pulse={isLive} />
          </div>

          {/* Description Section */}
          <div className="mb-5 pb-4 border-b border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
              {exam.shortDescription}
            </p>
          </div>

          {/* Time Information Section */}
          <div className="mb-5 space-y-3">
            {/* Date and Time Range */}
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <Calendar className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Exam Schedule
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatExamTimeRange(exam.startsAt, exam.endsAt)}
                </p>
              </div>
            </div>

            {/* Duration and Time per Question */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 p-2.5 bg-primary-50 rounded-lg border border-primary-100">
                <div className="p-1.5 bg-primary-100 rounded-md">
                  <Clock className="w-4 h-4 text-primary-600" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Duration</p>
                  <p className="text-sm font-bold text-primary-700">{formatDuration(exam.durationMin)}</p>
                </div>
              </div>
              {exam.timePerQuestionSec && (
                <div className="flex items-center gap-2.5 p-2.5 bg-brand-50 rounded-lg border border-brand-100">
                  <div className="p-1.5 bg-brand-100 rounded-md">
                    <Timer className="w-4 h-4 text-brand-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Per Question</p>
                    <p className="text-sm font-bold text-brand-700">{formatTimePerQuestion(exam.timePerQuestionSec)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Countdown Section */}
          {isLive && (
            <div className="mb-5 p-3 bg-danger-light/50 border border-danger-dark/20 rounded-lg">
              <div
                className="flex items-center gap-2 text-sm font-bold text-danger-dark"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-dark opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger-dark"></span>
                </div>
                <span>Ends in {countdownFormatted}</span>
              </div>
            </div>
          )}

          {/* Badges Section: Attempts and Re-records */}
          {(exam.attemptsLeft > 0 || exam.allowedReRecords > 0) && (
            <div className="mb-5 flex items-center gap-2 flex-wrap">
              {exam.attemptsLeft > 0 && (
                <Badge variant="success">
                  <span className="font-bold">{exam.attemptsLeft}</span>
                  <span className="ml-1">
                    {exam.attemptsLeft === 1 ? 'attempt' : 'attempts'} left
                  </span>
                </Badge>
              )}
              {exam.allowedReRecords > 0 && (
                <Badge variant="brand">
                  <span className="font-bold">{exam.allowedReRecords}</span>
                  <span className="ml-1">
                    re-record{exam.allowedReRecords !== 1 ? 's' : ''} left
                  </span>
                </Badge>
              )}
            </div>
          )}

          {/* Footer Section: Teacher, Questions, and Points */}
          <div className="mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-brand-400 flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-white">
                    {getInitials(exam.teacherName)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-700">{exam.teacherName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {exam.questions && exam.questions.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                    <FileText className="w-4 h-4 text-blue-600" aria-hidden="true" />
                    <span className="text-sm font-bold text-blue-700">{exam.questions.length}</span>
                    <span className="text-xs text-blue-600">Q</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-warning-light rounded-lg border border-warning-dark/20">
                  <Award className="w-4 h-4 text-warning-dark" aria-hidden="true" />
                  <span className="text-sm font-bold text-warning-dark">{exam.pointsTotal}</span>
                  <span className="text-xs text-warning-dark/80">pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button Section */}
          <div className="mt-6">
            {exam.status === 'live' && (
              <button
                onClick={handleJoinClick}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98] flex items-center justify-center gap-2 shadow-md hover:shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40"
                aria-label={`Join exam: ${exam.title}`}
              >
                <Play className="w-5 h-5" aria-hidden="true" />
                <span>Join now</span>
              </button>
            )}
            {exam.status === 'upcoming' && (
              <button
                onClick={handleViewDetails}
                className="w-full bg-white border-2 border-primary-300 hover:border-primary-500 hover:bg-primary-50 text-primary-600 hover:text-primary-700 font-bold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98]"
                aria-label={`View details for exam: ${exam.title}`}
              >
                View details
              </button>
            )}
            {exam.status === 'finished' && (
              <button
                onClick={handleViewResults}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-bold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 active:scale-[0.98]"
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
