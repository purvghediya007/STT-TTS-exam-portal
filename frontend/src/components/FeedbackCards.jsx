import React from 'react'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function FeedbackCards({ questions = [] }) {
  if (!questions || questions.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No feedback available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => {
        const isMCQ = q.type === 'mcq'
        const isCorrect = (q.score || 0) === (q.maxMarks || 0)
        const isSkipped = !q.feedback || q.feedback.includes('skipped')

        return (
          <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            {/* Question Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 mt-1">
                {isSkipped ? (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                ) : isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {q.instruction || q.text || `Question ${idx + 1}`}
                    </h3>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {q.type ? q.type.toUpperCase() : 'QUESTION'}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-600 mb-1">Score</div>
                    <div className={`text-lg font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {q.score ?? '-'}/{q.maxMarks ?? '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MCQ Details */}
            {isMCQ && q.options && Array.isArray(q.options) && (
              <div className="mb-3 pl-8">
                <div className="text-xs font-semibold text-gray-700 mb-2">Options:</div>
                <div className="space-y-1">
                  {q.options.map((option, optIdx) => {
                    const isSelected = q.selectedOptionIndex === optIdx
                    const isCorrectOption = option.isCorrect

                    let bgColor = 'bg-gray-50'
                    let borderColor = 'border-gray-200'
                    let textColor = 'text-gray-700'

                    if (isCorrectOption && isSelected) {
                      bgColor = 'bg-green-50'
                      borderColor = 'border-green-300'
                      textColor = 'text-green-900'
                    } else if (isCorrectOption && !isSelected) {
                      bgColor = 'bg-green-50'
                      borderColor = 'border-green-300'
                      textColor = 'text-green-700'
                    } else if (isSelected && !isCorrectOption) {
                      bgColor = 'bg-red-50'
                      borderColor = 'border-red-300'
                      textColor = 'text-red-900'
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-2 rounded border ${bgColor} ${borderColor} text-sm ${textColor}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-medium min-w-[1.5rem]">{String.fromCharCode(65 + optIdx)}.</span>
                          <span className="flex-1">{option.text || option}</span>
                          <span className="flex-shrink-0 text-xs">
                            {isCorrectOption && <span className="text-green-600 font-bold">✓ CORRECT</span>}
                            {isSelected && !isCorrectOption && <span className="text-red-600 font-bold">✗ YOUR ANSWER</span>}
                            {isSelected && isCorrectOption && <span className="text-green-600 font-bold">✓ YOUR ANSWER</span>}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Feedback/Evaluation Result */}
            {q.feedback && (
              <div className={`mt-3 pl-8 p-3 rounded text-sm ${isCorrect
                  ? 'bg-green-50 border border-green-200 text-green-900'
                  : 'bg-red-50 border border-red-200 text-red-900'
                }`}>
                <div className="font-semibold mb-1">
                  {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </div>
                <div className="text-xs">{q.feedback}</div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mt-3 pl-8">
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${q.maxMarks ? Math.round(((q.score || 0) / q.maxMarks) * 100) : 0}%`,
                  }}
                  className={`h-2 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
