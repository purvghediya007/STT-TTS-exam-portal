import React, { useState, useEffect } from 'react'
import { X, Save, Calendar, Clock, Award, Settings, FileText, AlertCircle } from 'lucide-react'
import { createExam, updateExam } from '../services/api'

/**
 * ExamForm - Form component for creating and editing exams
 */
export default function ExamForm({ exam, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    startsAt: '',
    endsAt: '',
    durationMin: 60,
    timePerQuestionSec: null,
    pointsTotal: 100,
    attemptsLeft: 1,
    allowedReRecords: 0,
    strictMode: false,
    instructions: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const isEditMode = !!exam

  useEffect(() => {
    if (exam) {
      // Convert exam data to form format
      const startDate = exam.startsAt ? new Date(exam.startsAt).toISOString().slice(0, 16) : ''
      const endDate = exam.endsAt ? new Date(exam.endsAt).toISOString().slice(0, 16) : ''
      
      setFormData({
        title: exam.title || '',
        shortDescription: exam.shortDescription || '',
        startsAt: startDate,
        endsAt: endDate,
        durationMin: exam.durationMin || 60,
        timePerQuestionSec: exam.timePerQuestionSec || null,
        pointsTotal: exam.pointsTotal || 100,
        attemptsLeft: exam.settingsSummary?.attemptsLeft || 1,
        allowedReRecords: exam.settingsSummary?.allowedReRecords || 0,
        strictMode: exam.settingsSummary?.strictMode || false,
        instructions: exam.settingsSummary?.instructions || ''
      })
    }
  }, [exam])

  const validate = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = 'Description is required'
    }
    
    if (!formData.startsAt) {
      newErrors.startsAt = 'Start date and time is required'
    }
    
    if (!formData.endsAt) {
      newErrors.endsAt = 'End date and time is required'
    }
    
    if (formData.startsAt && formData.endsAt) {
      const start = new Date(formData.startsAt)
      const end = new Date(formData.endsAt)
      
      if (end <= start) {
        newErrors.endsAt = 'End time must be after start time'
      }
      
      // Check if duration matches
      const diffMinutes = (end - start) / (1000 * 60)
      if (diffMinutes < formData.durationMin) {
        newErrors.durationMin = `Duration must be at least ${Math.ceil(diffMinutes)} minutes based on time range`
      }
    }
    
    if (formData.durationMin < 1) {
      newErrors.durationMin = 'Duration must be at least 1 minute'
    }
    
    if (formData.pointsTotal < 1) {
      newErrors.pointsTotal = 'Points must be at least 1'
    }
    
    if (formData.attemptsLeft < 0) {
      newErrors.attemptsLeft = 'Attempts cannot be negative'
    }
    
    if (formData.allowedReRecords < 0) {
      newErrors.allowedReRecords = 'Re-records cannot be negative'
    }
    
    if (formData.timePerQuestionSec !== null && formData.timePerQuestionSec < 1) {
      newErrors.timePerQuestionSec = 'Time per question must be at least 1 second'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      let teacherName = 'Current Faculty'
      try {
        const userData = JSON.parse(localStorage.getItem('user_data'))
        if (userData?.role === 'faculty') {
          teacherName = userData.name || userData.facultyId || 'Current Faculty'
        }
      } catch {
        // Ignore parsing errors
      }

      const examData = {
        title: formData.title.trim(),
        shortDescription: formData.shortDescription.trim(),
        startsAt: new Date(formData.startsAt).toISOString(),
        endsAt: new Date(formData.endsAt).toISOString(),
        durationMin: formData.durationMin,
        timePerQuestionSec: formData.timePerQuestionSec || null,
        pointsTotal: formData.pointsTotal,
        teacherName,
        settingsSummary: {
          strictMode: formData.strictMode,
          attemptsLeft: formData.attemptsLeft,
          allowedReRecords: formData.allowedReRecords,
          instructions: formData.instructions
        }
      }

      let result
      if (isEditMode) {
        result = await updateExam(exam.id, examData)
      } else {
        result = await createExam(examData)
      }

      // Show success message
      if (result) {
        // Small delay to show success state
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 300)
      } else {
        onSuccess?.()
        onClose()
      }
    } catch (error) {
      console.error('Error saving exam:', error)
      setErrors({ submit: error.message || 'Failed to save exam. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Exam' : 'Create New Exam'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Exam Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Introduction to Algorithms - Midterm"
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.shortDescription}
              onChange={(e) => handleChange('shortDescription', e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.shortDescription ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Brief description of the exam..."
            />
            {errors.shortDescription && <p className="text-red-600 text-sm mt-1">{errors.shortDescription}</p>}
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => handleChange('instructions', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed instructions for students..."
            />
          </div>

          {/* Date and Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => handleChange('startsAt', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.startsAt ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startsAt && <p className="text-red-600 text-sm mt-1">{errors.startsAt}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endsAt}
                onChange={(e) => handleChange('endsAt', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.endsAt ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endsAt && <p className="text-red-600 text-sm mt-1">{errors.endsAt}</p>}
            </div>
          </div>

          {/* Duration and Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.durationMin}
                onChange={(e) => handleChange('durationMin', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.durationMin ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.durationMin && <p className="text-red-600 text-sm mt-1">{errors.durationMin}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Award className="w-4 h-4 inline mr-1" />
                Total Points <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.pointsTotal}
                onChange={(e) => handleChange('pointsTotal', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.pointsTotal ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.pointsTotal && <p className="text-red-600 text-sm mt-1">{errors.pointsTotal}</p>}
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
              value={formData.timePerQuestionSec || ''}
              onChange={(e) => handleChange('timePerQuestionSec', e.target.value ? parseInt(e.target.value) : null)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.timePerQuestionSec ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Leave empty for no limit"
            />
            {errors.timePerQuestionSec && <p className="text-red-600 text-sm mt-1">{errors.timePerQuestionSec}</p>}
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
                value={formData.attemptsLeft}
                onChange={(e) => handleChange('attemptsLeft', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.attemptsLeft ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.attemptsLeft && <p className="text-red-600 text-sm mt-1">{errors.attemptsLeft}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Allowed Re-records
              </label>
              <input
                type="number"
                min="0"
                value={formData.allowedReRecords}
                onChange={(e) => handleChange('allowedReRecords', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.allowedReRecords ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.allowedReRecords && <p className="text-red-600 text-sm mt-1">{errors.allowedReRecords}</p>}
            </div>
          </div>

          {/* Settings */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.strictMode}
                onChange={(e) => handleChange('strictMode', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-gray-700">Strict Mode</span>
                <p className="text-xs text-gray-500">Enable strict exam rules (no backtracking, etc.)</p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditMode ? 'Update Exam' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

