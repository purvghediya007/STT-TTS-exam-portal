import React, { useMemo } from 'react'
import { Calendar, RefreshCw, Clock, GraduationCap } from 'lucide-react'
import { useExams } from '../hooks/useExams'
import ExamCard from '../components/ExamCard'
import SkeletonCard from '../components/SkeletonCard'
import ErrorState from '../components/ErrorState'

/**
 * AvailableQuizView - Exact structure and color match to Upcoming View
 */
export default function AvailableQuizView() {
  const {
    exams = [],
    loading = false,
    error,
    refreshExams = () => {},
    prefetchExamSummary = () => {}
  } = useExams() || {}

  // --- LOGIC PRESERVED EXACTLY ---
  const availableExams = useMemo(() => {
    const now = new Date()
    const filtered = exams.filter((exam) => {
      // Check status first
      if (exam.status === 'live' || exam.status === 'available') return true
      
      // Then check dates
      if (!exam.startsAt || !exam.endsAt) return false
      const starts = new Date(exam.startsAt)
      const ends = new Date(exam.endsAt)
      
      if (!isNaN(starts.getTime()) && !isNaN(ends.getTime())) {
        return now >= starts && now < ends
      }
      return false
    })
    return filtered
  }, [exams])
  // --- END LOGIC ---

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 pt-1 pb-4 space-y-5">
      
      {/* Page Header Area - Clean Light Blue Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-blue-100">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Available Quizzes
          </h1>
          {!loading && !error && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-medium">
                {availableExams.length > 0 
                  ? `${availableExams.length} assessment${availableExams.length > 1 ? 's' : ''} available now`
                  : 'No active assessments'
                }
              </p>
            </div>
          )}
        </div>

        {/* Refresh Button - Light Blue Theme */}
        <button
          onClick={refreshExams}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95 font-medium text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <ErrorState message={error} onRetry={refreshExams} />
        </div>
      )}

      {/* Loading State - Clean Light Blue Theme */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl p-4 h-80 border border-gray-200" />
          ))}
        </div>
      )}

      {/* Empty State - Clean Light Blue Theme */}
      {!loading && !error && availableExams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-blue-50 rounded-xl border border-blue-100">
          <div className="p-4 bg-blue-100 rounded-full mb-4">
            <Calendar className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Nothing Available!</h3>
          <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed">
            There are no active quizzes for you to take right now. Check your "Upcoming" tab to see when your next test starts.
          </p>
        </div>
      )}

      {/* Exam Cards Grid - Clean Responsive Layout */}
      {!loading && !error && availableExams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableExams.map((exam) => (
            <ExamCard 
              key={exam.id}
              exam={exam} 
              onPrefetch={() => prefetchExamSummary(exam.id)} 
            />
          ))}
        </div>
      )}
    </div>
  )
}