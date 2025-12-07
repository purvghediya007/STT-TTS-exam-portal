import React from 'react'
import { List, CheckCircle } from 'lucide-react'

export default function QuestionNavigator({ questions, currentIndex, mediaAnswers, onSelect, answeredCount }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
          <List className="w-3 h-3" />
          Question Navigator
        </span>
        <span className="text-xs text-gray-500">
          {answeredCount} of {questions.length} answered
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center p-2 bg-gray-50 rounded-lg">
        {questions.map((q, index) => {
          const questionId = q.id
          const isAnswered = mediaAnswers[questionId] !== undefined && mediaAnswers[questionId] !== '' && mediaAnswers[questionId] != null
          const questionType = q.type || 'viva'
          const isCurrent = index === currentIndex
          return (
            <button
              key={questionId || index}
              onClick={() => onSelect(index)}
              title={`Question ${index + 1}: ${questionType.toUpperCase()}${isAnswered ? ' (Answered)' : ' (Not answered)'}`}
              className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center relative ${
                isCurrent
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-md scale-110'
                  : isAnswered
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {index + 1}
              {isAnswered && !isCurrent && (
                <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-green-600 bg-white rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
