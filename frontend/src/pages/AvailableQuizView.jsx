import React, { useMemo } from 'react'
import { CheckSquare, AlertCircle } from 'lucide-react'
import { useExams } from '../hooks/useExams'
import ExamCard from '../components/ExamCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'

/**
 * AvailableQuizView - Shows all currently available/live exams
 */
// Demo exams for display
const DEMO_AVAILABLE_EXAMS = [
  {
    id: 'DEMO-AV-001',
    title: 'Operating Systems - Quiz 2',
    shortDescription: 'Process management, memory allocation, and file systems.',
    startsAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
    endsAt: new Date(Date.now() + 50 * 60 * 1000).toISOString(), // 50 min from now
    durationMin: 60,
    timePerQuestionSec: 45,
    status: 'live',
    attemptsLeft: 1,
    allowedReRecords: 1,
    teacherName: 'Dr. Emily Rodriguez',
    pointsTotal: 75,
    thumbnailUrl: null,
    settingsSummary: { strictMode: false },
  },
  {
    id: 'DEMO-AV-002',
    title: 'Software Engineering - Assignment Test',
    shortDescription: 'SDLC, design patterns, and project management methodologies.',
    startsAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    endsAt: new Date(Date.now() + 85 * 60 * 1000).toISOString(), // 85 min from now
    durationMin: 90,
    timePerQuestionSec: 60,
    status: 'live',
    attemptsLeft: 2,
    allowedReRecords: 0,
    teacherName: 'Prof. David Kim',
    pointsTotal: 100,
    thumbnailUrl: null,
    settingsSummary: { strictMode: true },
  },
]

export default function AvailableQuizView() {
  const {
    exams = [],
    loading = false,
    error,
    refreshExams = () => {},
    prefetchExamSummary = () => {}
  } = useExams() || {}

  // Filter available/live exams
  const availableExams = useMemo(() => {
    const now = new Date()
    const filtered = exams.filter((exam) => {
      // Check status first
      if (exam.status === 'live') return true
      
      // Then check dates if status is not set correctly
      if (!exam.startsAt || !exam.endsAt) return false
      const starts = new Date(exam.startsAt)
      const ends = new Date(exam.endsAt)
      
      // Exam is available if current time is between start and end
      if (!isNaN(starts.getTime()) && !isNaN(ends.getTime())) {
        return now >= starts && now < ends
      }
      return false
    })
    return filtered
  }, [exams])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Available Quiz</h1>
          {availableExams.length > 0 && (
            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Live
            </span>
          )}
        </div>
        <p className="text-gray-600">
          {availableExams.length > 0 
            ? `You have ${availableExams.length} exam${availableExams.length > 1 ? 's' : ''} available to take right now`
            : 'No exams are currently available. Check back later.'
          }
        </p>
      </div>

      {/* Error State */}
      {error && <ErrorState message={error} onRetry={refreshExams} />}

      {/* Loading State */}
      {loading && (
        <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && availableExams.length === 0 && (
        <EmptyState 
          message="No available exams"
          description="There are no exams available at this moment. Upcoming exams will appear here when they become available."
        />
      )}

      {/* Exam Cards */}
      {!loading && !error && availableExams.length > 0 && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-700">
              <CheckSquare className="w-5 h-5" />
              <p className="font-medium">These exams are currently live. Click "Join now" to start taking them.</p>
            </div>
          </div>
          <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-6">
            {availableExams.map((exam) => (
              <ExamCard 
                key={exam.id} 
                exam={exam} 
                onPrefetch={() => prefetchExamSummary(exam.id)} 
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

