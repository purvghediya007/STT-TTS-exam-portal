import React, { useMemo, useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useExams } from '../hooks/useExams'
import HistoryTable from '../components/HistoryTable'

/**
 * HistoryView - Shows exam history with detailed table
 */
export default function HistoryView() {
  const { exams = [] } = useExams() || {}
  const [submissions, setSubmissions] = useState({})

  // Fetch submissions for all exams
  useEffect(() => {
    const fetchSubmissions = async () => {
      const submissionsMap = {}
      for (const exam of exams) {
        try {
          const response = await fetch(`/api/student/exams/${exam.id}/submissions?studentId=STU001`)
          if (response.ok) {
            const data = await response.json()
            if (data.submissions && data.submissions.length > 0) {
              // Get the most recent submission
              submissionsMap[exam.id] = data.submissions[data.submissions.length - 1]
            }
          }
        } catch {
          // Ignore errors
        }
      }
      setSubmissions(submissionsMap)
    }
    fetchSubmissions()
  }, [exams])

  // Get submitted/completed exams with submission data
  const completedExams = useMemo(() => {
    const now = new Date()
    return exams
      .filter((exam) => {
        // Check status first
        if (exam.status === 'finished') return true
        
        // Then check dates if status is not set correctly
        if (!exam.endsAt) return false
        const ends = new Date(exam.endsAt)
        
        // Exam is finished if end time has passed
        if (!isNaN(ends.getTime())) {
          return now >= ends
        }
        return false
      })
      .map(exam => {
        const submission = submissions[exam.id]
        return {
          ...exam,
          result: submission ? {
            score: submission.score,
            maxScore: submission.maxScore
          } : null,
          pointsAwarded: submission?.score,
          totalScore: submission?.maxScore,
          timeTakenSec: submission?.timeSpent ? submission.timeSpent * 60 : null,
          endsAt: submission?.submittedAt || exam.endsAt
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
