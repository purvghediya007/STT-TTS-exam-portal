import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, XCircle, Award, ArrowLeft, Home } from 'lucide-react'

/**
 * ExamResultsView - Page to display exam results
 */
export default function ExamResultsView() {
  const navigate = useNavigate()
  const location = useLocation()
  const [result] = useState(location.state || {
    score: 0,
    maxScore: 0,
    percentage: 0
  })

  if (!result) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading results...</div>
      </div>
    )
  }

  const { score, maxScore, percentage } = result
  const passed = percentage >= 60

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          {passed ? (
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          ) : (
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {passed ? 'Congratulations!' : 'Exam Completed'}
          </h1>
          <p className="text-gray-600">
            {passed 
              ? 'You have successfully passed the exam!' 
              : 'You have completed the exam. Better luck next time!'}
          </p>
        </div>

        {/* Score Display */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Award className="w-8 h-8 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900">Your Score</span>
            </div>
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {score}/{maxScore}
            </div>
            <div className="text-2xl font-semibold text-gray-700">
              {percentage}%
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    passed ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/student/history')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            View History
          </button>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

