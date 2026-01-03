import React, { useMemo, useEffect, useState } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { useExams } from '../hooks/useExams'
import { useAuth } from '../contexts/AuthContext'
import { fetchAPI } from '../services/api'
import HistoryTable from '../components/HistoryTable'

/**
 * HistoryView - Shows exam history with detailed table
 */
export default function HistoryView() {
  const { exams = [] } = useExams() || {}
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // Fetch submissions for all exams
  const fetchSubmissions = async () => {
    setIsLoading(true)
    try {
      if (!user?.sub || exams.length === 0) return

      const fetchPromises = exams.map(exam =>
        fetchAPI(`/student/exams/${exam.id}/submissions?studentId=${user.sub}`)
          .then(response => response.json())
          .then(data => ({
            examId: exam.id,
            data: data
          }))
          .catch(error => ({
            examId: exam.id,
            error: error
          }))
      )

      const results = await Promise.all(fetchPromises)

      const submissionsMap = {}
      results.forEach(result => {
        if (!result.error && result.data.submissions && result.data.submissions.length > 0) {
          const mostRecent = result.data.submissions[result.data.submissions.length - 1]
          submissionsMap[result.examId] = mostRecent
        }
      })

      setSubmissions(submissionsMap)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [exams, user?.sub])

  const completedExams = useMemo(() => {
    return exams.map(exam => {
      const submission = submissions[exam.id]
      return {
        ...exam,
        result: submission ? {
          score: submission.totalScore,
          maxScore: submission.maxScore
        } : null,
        pointsAwarded: submission?.totalScore,
        totalScore: submission?.maxScore,
        percentage: submission?.percentage,
        timeTakenSec: submission?.timeSpent ? submission.timeSpent * 60 : null,
        endsAt: submission?.finishedAt || exam.endsAt || exam.endTime,
        endTime: submission?.finishedAt || exam.endTime,
        pointsTotal: exam.pointsTotal || submission?.maxScore
      }
    })
  }, [exams, submissions])

  return (
    <div className="min-h-screen bg-blue-50/30">
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 pt-1 pb-4 space-y-4">
        
        {/* Clean Header Section - Light Blue Theme */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Exam <span className="text-blue-600">History</span>
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              Track your progress and review detailed performance metrics
            </p>
          </div>

          <button
            onClick={fetchSubmissions}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all active:scale-95 font-medium text-sm shadow-sm hover:shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>

        {/* History Table Container - Clean Light Blue Theme */}
        <div className="bg-white rounded-xl border-[0.5px] border-blue-200 shadow-sm overflow-hidden">
          {/* Internal Table Header Labeling */}
          <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Assessment Logs
            </h2>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
              <Clock className="w-3.5 h-3.5" />
              <span>Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto">
            <HistoryTable exams={completedExams} />
          </div>
        </div>

        {/* Responsive Footer Info */}
        <div className="flex justify-center sm:justify-start">
          <p className="text-xs text-gray-500 font-medium">
            * Only successfully submitted attempts are displayed in this view.
          </p>
        </div>
      </div>
    </div>
  )
}