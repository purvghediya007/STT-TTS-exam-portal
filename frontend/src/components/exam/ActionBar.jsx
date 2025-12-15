import React from 'react'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'

export default function ActionBar({ onPrevious, onNext, onSubmit, disablePrevious, isLast, submitting, timeExpired, currentIndex, total }) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
      <button
        onClick={onPrevious}
        disabled={disablePrevious}
        className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Question {currentIndex + 1} of {total}</span>
      </div>

      {isLast ? (
        <button
          onClick={onSubmit}
          disabled={submitting || timeExpired}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
        >
          <Save className="w-4 h-4" />
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      ) : (
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
