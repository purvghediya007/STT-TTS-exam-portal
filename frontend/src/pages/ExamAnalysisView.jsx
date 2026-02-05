import React from 'react'
import { useParams, useLocation } from 'react-router-dom'
import ExamAnalysis from '../components/ExamAnalysis'

export default function ExamAnalysisView() {
  const { examId } = useParams()
  const { state } = useLocation()

  return (
    <div className="min-h-screen p-6 bg-blue-50/20">
      <div className="max-w-6xl mx-auto">
        <ExamAnalysis
          examId={examId}
          attemptId={state?.attemptId}
          initialExam={state?.exam}
          initialPercentage={state?.percentage}
        />
      </div>
    </div>
  )
}
