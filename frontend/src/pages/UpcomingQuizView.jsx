import React, { useMemo } from 'react'
import { Calendar, RefreshCw } from 'lucide-react'
import { useExams } from '../hooks/useExams'
import ExamCard from '../components/ExamCard'
import SkeletonCard from '../components/SkeletonCard'
import ErrorState from '../components/ErrorState'

/**
 * UpcomingQuizView - Shows all upcoming exams
 */
// Demo exams for display
const DEMO_UPCOMING_EXAMS = [
  {
    id: 'DEMO-UP-001',
    title: 'Computer Networks - Midterm Exam',
    shortDescription: 'Covering OSI model, TCP/IP protocols, and network topologies.',
    startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString(),
    durationMin: 120,
    timePerQuestionSec: 90,
    status: 'upcoming',
    attemptsLeft: 1,
    allowedReRecords: 0,
    teacherName: 'Dr. Sarah Johnson',
    pointsTotal: 100,
    thumbnailUrl: null,
    settingsSummary: { strictMode: true },
  },
  {
    id: 'DEMO-UP-002',
    title: 'Data Structures - Final Assessment',
    shortDescription: 'Trees, graphs, sorting algorithms, and complexity analysis.',
    startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 150 * 60 * 1000).toISOString(),
    durationMin: 150,
    timePerQuestionSec: 120,
    status: 'upcoming',
    attemptsLeft: 1,
    allowedReRecords: 0,
    teacherName: 'Prof. Michael Chen',
    pointsTotal: 150,
    thumbnailUrl: null,
    settingsSummary: { strictMode: false },
  },
]

export default function UpcomingQuizView() {
  const {
    exams = [],
    loading = false,
    error,
    refreshExams = () => {},
    prefetchExamSummary = () => {}
  } = useExams() || {}

  // Filter upcoming exams
  const upcomingExams = useMemo(() => {
    const now = new Date()
    const filtered = exams.filter((exam) => {
      // Check status first
      if (exam.status === 'upcoming') return true
      
      // Then check dates if status is not set correctly
      if (!exam.startsAt) return false
      const starts = new Date(exam.startsAt)
      
      // Exam is upcoming if start time is in the future
      if (!isNaN(starts.getTime())) {
        return now < starts
      }
      return false
    })
    return filtered
  }, [exams])

  return (
    <div className="space-y-6">
      {/* Page Header with Refresh Button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Quiz</h1>
          {!loading && !error && (
            <p className="text-gray-600">
              {upcomingExams.length > 0 
                ? `You have ${upcomingExams.length} upcoming exam${upcomingExams.length > 1 ? 's' : ''} scheduled`
                : 'There are no upcoming quizzes at the moment. Stay tuned for future updates!'
              }
            </p>
          )}
        </div>
        <button
          onClick={refreshExams}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
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
      {!loading && !error && upcomingExams.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">No upcoming exams</p>
          <p className="text-gray-500">There are no upcoming quizzes scheduled at this moment. Stay tuned for future updates!</p>
        </div>
      )}

      {/* Exam Cards */}
      {!loading && !error && upcomingExams.length > 0 && (
        <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-6">
          {upcomingExams.map((exam) => (
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

