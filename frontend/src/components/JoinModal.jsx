/**
 * JoinModal component - modal for starting an exam attempt
 */

import { useState, useEffect, useRef } from 'react'
import { 
  Clock, 
  AlertCircle, 
  Mic, 
  X,
  CheckCircle,
  Shield
} from 'lucide-react'
import { startExam } from '../services/api'
import { formatDuration, formatTimePerQuestion } from '../utils/format'
import Badge from './Badge'

/**
 * @param {Object} props
 * @param {import('../services/api').Exam} props.exam
 * @param {() => void} props.onClose
 * @param {(attemptId: string) => void} props.onSuccess
 */
export default function JoinModal({ exam, onClose, onSuccess }) {
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Focus trap and keyboard handling
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    // Focus first focusable element
    const firstFocusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (firstFocusable) {
      firstFocusable.focus()
    }

    // Handle Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isStarting) {
        onClose()
      }
    }

    // Handle Tab key for focus trap
    const handleTab = (e) => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          if (lastElement) lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          if (firstElement) firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleTab)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)
    }
  }, [onClose, isStarting])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        modalRef.current &&
        e.target &&
        !modalRef.current.contains(e.target) &&
        !isStarting
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, isStarting])

  const handleStart = async () => {
    setIsStarting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await startExam(exam.id)
      setSuccess(true)
      // Small delay to show success animation
      setTimeout(() => {
        onSuccess(response.attemptId)
      }, 500)
    } catch (err) {
      const errorData = err
      let errorMessage = 'Failed to start exam. Please try again.'

      if (errorData.status === 403 || errorData.status === 400) {
        errorMessage = errorData.message || errorMessage
      } else if (errorData.error === 'attempts_exhausted') {
        errorMessage = 'You have no attempts left for this exam.'
      } else if (errorData.error === 'not_live') {
        errorMessage = 'This exam is not currently live.'
      }

      setError(errorMessage)
      setIsStarting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-modal-title"
      aria-describedby="join-modal-description"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="join-modal-title"
            className="text-2xl font-bold text-slate-900"
          >
            Start Exam
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            disabled={isStarting}
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md p-1 disabled:opacity-50 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Exam title */}
        <div id="join-modal-description" className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {exam.title}
          </h3>

          {/* Exam details */}
          <div className="space-y-3 text-sm bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between py-2">
              <span className="font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-500" aria-hidden="true" />
                Time allowed:
              </span>
              <span className="font-medium text-slate-700">{formatDuration(exam.durationMin)}</span>
            </div>

            {exam.timePerQuestionSec && (
              <div className="flex items-center justify-between py-2 border-t border-slate-200">
                <span className="font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-500" aria-hidden="true" />
                  Time per question:
                </span>
                <span className="font-medium text-slate-700">{formatTimePerQuestion(exam.timePerQuestionSec)}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-t border-slate-200">
              <span className="font-semibold text-slate-800">Attempts left:</span>
              <span className="font-medium text-slate-700">{exam.attemptsLeft}</span>
            </div>

            {exam.allowedReRecords > 0 && (
              <div className="flex items-center justify-between py-2 border-t border-slate-200">
                <span className="font-semibold text-slate-800">Re-records allowed:</span>
                <span className="font-medium text-slate-700">{exam.allowedReRecords}</span>
              </div>
            )}

            {exam.settingsSummary?.strictMode && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <Shield className="w-4 h-4 text-warning-dark" aria-hidden="true" />
                <Badge variant="warning">Strict Mode Enabled</Badge>
              </div>
            )}
          </div>

          {/* Microphone requirement */}
          <div className="mt-4 p-4 bg-warning-light border border-warning-dark/20 rounded-xl">
            <p className="text-warning-dark flex items-start gap-2 text-sm">
              <Mic className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                A working microphone is required for this exam. Please ensure
                your microphone is connected and working before starting.
              </span>
            </p>
          </div>
        </div>

        {/* Success state */}
        {success && (
          <div
            className="mb-4 p-4 bg-success-light border border-success-dark/20 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95"
            role="alert"
            aria-live="assertive"
          >
            <CheckCircle className="w-5 h-5 text-success-dark flex-shrink-0" aria-hidden="true" />
            <span className="text-success-dark font-medium">Starting exam...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            className="mb-4 p-4 bg-danger-light border border-danger-dark/20 rounded-xl flex items-center gap-2"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="w-5 h-5 text-danger-dark flex-shrink-0" aria-hidden="true" />
            <span className="text-danger-dark text-sm">{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isStarting || success}
            className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={isStarting || exam.attemptsLeft === 0 || success}
            className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-md font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isStarting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Starting...
              </>
            ) : (
              'Start Exam'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
