import React, { useEffect } from 'react'
import { Calendar, Clock, Award, Settings, AlertCircle } from 'lucide-react'

/**
 * ExamTimeSettings - Component for setting exam time, dates, and other settings
 */
export default function ExamTimeSettings({ timeSettings, onChange, errors = {}, questions = [] }) {
  // Auto-calculate duration when start/end dates change
  useEffect(() => {
    if (timeSettings.startsAt && timeSettings.endsAt) {
      const start = new Date(timeSettings.startsAt)
      const end = new Date(timeSettings.endsAt)
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const diffMinutes = Math.ceil((end - start) / (1000 * 60))
        if (diffMinutes !== timeSettings.durationMin) {
          onChange({ ...timeSettings, durationMin: diffMinutes })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSettings.startsAt, timeSettings.endsAt])

  // Auto-calculate total points from questions
  useEffect(() => {
    if (questions && questions.length > 0) {
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)
      if (totalPoints !== timeSettings.pointsTotal) {
        onChange({ ...timeSettings, pointsTotal: totalPoints })
      }
    } else if (questions && questions.length === 0 && timeSettings.pointsTotal > 0) {
      // Reset to 0 if no questions
      onChange({ ...timeSettings, pointsTotal: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions])

  const handleChange = (field, value) => {
    const updated = { ...timeSettings, [field]: value }
    
    // Auto-calculate duration if start/end dates are changed
    if ((field === 'startsAt' || field === 'endsAt') && updated.startsAt && updated.endsAt) {
      const start = new Date(updated.startsAt)
      const end = new Date(updated.endsAt)
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        updated.durationMin = Math.ceil((end - start) / (1000 * 60))
      }
    }
    
    onChange(updated)
  }

  return (
    <div className="space-y-6">
      {/* Date and Time Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Start Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={timeSettings.startsAt}
            onChange={(e) => handleChange('startsAt', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.startsAt ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.startsAt && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.startsAt}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            End Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={timeSettings.endsAt}
            onChange={(e) => handleChange('endsAt', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.endsAt ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.endsAt && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.endsAt}
            </p>
          )}
        </div>
      </div>

      {/* Duration and Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Duration (minutes) <span className="text-gray-500 text-xs">(Auto-calculated)</span>
          </label>
          <input
            type="number"
            min="1"
            value={timeSettings.durationMin}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Automatically calculated from start and end time
          </p>
          {errors.durationMin && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.durationMin}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Award className="w-4 h-4 inline mr-1" />
            Total Marks <span className="text-gray-500 text-xs">(Auto-calculated)</span>
          </label>
          <input
            type="number"
            min="1"
            value={timeSettings.pointsTotal}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Automatically calculated from sum of all question points ({questions?.length || 0} questions)
          </p>
          {errors.pointsTotal && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.pointsTotal}
            </p>
          )}
        </div>
      </div>

      {/* Time per Question (Optional) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Clock className="w-4 h-4 inline mr-1" />
          Time per Question (seconds) <span className="text-gray-500 text-xs">(Optional)</span>
        </label>
        <input
          type="number"
          min="1"
          value={timeSettings.timePerQuestionSec || ''}
          onChange={(e) => handleChange('timePerQuestionSec', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Leave empty for no limit"
        />
        <p className="text-xs text-gray-500 mt-1">
          If set, students will have a time limit per question
        </p>
      </div>

      {/* Attempts and Re-records */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Allowed Attempts
          </label>
          <input
            type="number"
            min="0"
            value={timeSettings.attemptsLeft}
            onChange={(e) => handleChange('attemptsLeft', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Allowed Re-records
          </label>
          <input
            type="number"
            min="0"
            value={timeSettings.allowedReRecords}
            onChange={(e) => handleChange('allowedReRecords', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Settings */}
      <div className="border-t border-gray-200 pt-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={timeSettings.strictMode}
            onChange={(e) => handleChange('strictMode', e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-semibold text-gray-700">Strict Mode</span>
            <p className="text-xs text-gray-500">Enable strict exam rules (no backtracking, etc.)</p>
          </div>
        </label>
      </div>

      {/* Status Preview */}
      {timeSettings.startsAt && timeSettings.endsAt && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Exam Status Preview</p>
              <p className="text-xs text-blue-700">
                {(() => {
                  const start = new Date(timeSettings.startsAt)
                  const end = new Date(timeSettings.endsAt)
                  const now = new Date()
                  
                  if (start > now) {
                    return 'Status: Upcoming - Exam will be available when start time is reached'
                  } else if (now >= start && now < end) {
                    return 'Status: Available - Exam is currently live'
                  } else if (end <= now) {
                    return 'Status: Finished - Exam has ended'
                  }
                  return 'Status will be set automatically based on dates'
                })()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

