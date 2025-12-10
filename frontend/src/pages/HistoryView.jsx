import React, { useMemo, useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
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

  // Fetch submissions for all exams
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user?.sub) return // Wait for user to be loaded

      const submissionsMap = {}
      for (const exam of exams) {
        try {
          const response = await fetchAPI(`/student/exams/${exam.id}/submissions?studentId=${user.sub}`)
          const data = await response.json()
          if (data.submissions && data.submissions.length > 0) {
            // Get the most recent submission
            submissionsMap[exam.id] = data.submissions[data.submissions.length - 1]
          }
        } catch (error) {
          console.error(`Failed to fetch submissions for exam ${exam.id}:`, error)
        }
      }
      setSubmissions(submissionsMap)
    }
    fetchSubmissions()
  }, [exams, user?.sub])

  // Get all exams with submission data
  const completedExams = useMemo(() => {
    return exams.map(exam => {
      const submission = submissions[exam.id]
      return {
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
    })
  }, [exams, submissions])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam History</h1>
        <p className="text-gray-600">
          View all your completed exams, scores, and performance history
        </p>
      </div>

      {/* History Table */}
      <HistoryTable exams={completedExams} />
    </div>
  )
}
