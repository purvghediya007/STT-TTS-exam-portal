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
      if (!user?.sub) {
        return
      }

      if (exams.length === 0) {
        return
      }

      // Fetch all submissions in parallel instead of one at a time
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

  // Get all exams with submission data
  const completedExams = useMemo(() => {
    const result = exams.map(exam => {
      const submission = submissions[exam.id]
      const processed = {
        ...exam,
        // Map submission data to expected fields
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

      if (submission) {
        console.log(`📋 Exam: ${exam.title}`)
        console.log(`   Submission status: ${submission.status}`)
        console.log(`   Mapped score: ${processed.result.score}`)
        console.log(`   Mapped maxScore: ${processed.result.maxScore}`)
      }

      return processed
    })
    return result
  }, [exams, submissions])

  return (
    <div className="space-y-6">
      {/* Page Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam History</h1>
          <p className="text-gray-600">
            View all your completed exams, scores, and performance history
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchSubmissions}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* History Table */}
      <HistoryTable exams={completedExams} />
    </div>
  )
}
