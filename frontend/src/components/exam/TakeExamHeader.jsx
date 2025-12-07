import React from 'react'
import { ArrowLeft, FileText, Clock, CheckCircle, Award } from 'lucide-react'

export default function TakeExamHeader({ title, currentIndex, totalQuestions, timeRemaining, timeExpired, answeredCount, totalPoints, onBack }) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Go back to available exams">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Question {currentIndex + 1} of {totalQuestions}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time Remaining</div>
              <div className={`flex items-center gap-2 text-lg font-bold ${timeExpired ? 'text-red-600' : 'text-gray-900'}`}>
                <Clock className={`w-5 h-5 ${timeExpired ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
                <span>{timeExpired ? 'Time Up!' : timeRemaining}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Progress</div>
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <CheckCircle className={`w-5 h-5 ${answeredCount === totalQuestions ? 'text-green-600' : 'text-blue-600'}`} />
                <span>{answeredCount}/{totalQuestions}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Points</div>
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Award className="w-5 h-5 text-yellow-600" />
                <span>{totalPoints} pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
