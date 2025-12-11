import React, { useState, useEffect } from 'react'
import { X, ArrowRight, ArrowLeft, Save, Check } from 'lucide-react'
import { createDraftExam, updateDraftExam, publishDraftExam } from '../services/api'
import QuestionBuilder from './QuestionBuilder'
import ExamTimeSettings from './ExamTimeSettings'

/**
 * Multi-step exam creation wizard
 * Step 1: Basic Info (Title, Description, Instructions)
 * Step 2: Questions (MCQ/Descriptive)
 * Step 3: Time Settings
 */
export default function ExamCreationWizard({ onClose, onSuccess, draft: initialDraft, exam: initialExam }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [draftId, setDraftId] = useState(initialDraft?.id || initialExam?.id || null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Step 1: Basic Info - Load from draft/exam if available
  const [basicInfo, setBasicInfo] = useState({
    title: initialDraft?.title || initialExam?.title || '',
    shortDescription: initialDraft?.shortDescription || initialExam?.shortDescription || '',
    instructions: initialDraft?.instructions || initialExam?.settingsSummary?.instructions || ''
  })

  // Step 2: Questions - Load from draft/exam if available
  const [questions, setQuestions] = useState(initialDraft?.questions || initialExam?.questions || [])

  // Step 3: Time Settings - Load from exam if available
  const [timeSettings, setTimeSettings] = useState({
    startsAt: initialExam?.startsAt ? new Date(initialExam.startsAt).toISOString().slice(0, 16) : '',
    endsAt: initialExam?.endsAt ? new Date(initialExam.endsAt).toISOString().slice(0, 16) : '',
    durationMin: initialExam?.durationMin || 60,
    timePerQuestionSec: initialExam?.timePerQuestionSec || null,
    pointsTotal: initialExam?.pointsTotal || (questions.length > 0 ? questions.reduce((sum, q) => sum + (q.points || 1), 0) : 100),
    attemptsLeft: initialExam?.settingsSummary?.attemptsLeft || 1,
    allowedReRecords: initialExam?.settingsSummary?.allowedReRecords || 0,
    strictMode: initialExam?.settingsSummary?.strictMode || false
  })

  // If editing a draft, start at step 2 if questions exist, otherwise step 1
  useEffect(() => {
    if (initialDraft) {
      if (initialDraft.questions && initialDraft.questions.length > 0) {
        setCurrentStep(2)
      } else {
        setCurrentStep(1)
      }
    } else if (initialExam) {
      // If editing an exam, start at step 3 (time settings)
      setCurrentStep(3)
    }
  }, [initialDraft, initialExam])

  const validateStep1 = () => {
    const newErrors = {}
    if (!basicInfo.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!basicInfo.shortDescription.trim()) {
      newErrors.shortDescription = 'Short description is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStep1Next = async () => {
    if (!validateStep1()) return

    setLoading(true)
    try {
      let teacherName = 'Current Faculty'
      try {
        const userData = JSON.parse(localStorage.getItem('user_data'))
        if (userData?.role === 'faculty') {
          teacherName = userData.name || userData.facultyId || 'Current Faculty'
        }
      } catch {
        // Ignore
      }

      const draftData = {
        title: basicInfo.title.trim(),
        shortDescription: basicInfo.shortDescription.trim(),
        instructions: basicInfo.instructions.trim() || null,
        teacherName,
        status: 'draft',
        questions: [],
        createdAt: new Date().toISOString()
      }

      let result
      if (draftId) {
        result = await updateDraftExam(draftId, draftData)
      } else {
        result = await createDraftExam(draftData)
        setDraftId(result.id)
      }

      if (result) {
        setCurrentStep(2)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      setErrors({ submit: error.message || 'Failed to save draft. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Next = async () => {
    if (questions.length === 0) {
      setErrors({ questions: 'Please add at least one question' })
      return
    }

    setLoading(true)
    try {
      // Only update draft if we have a draftId (not editing a published exam)
      if (draftId && !initialExam) {
        try {
          await updateDraftExam(draftId, { questions })
        } catch (error) {
          // If draft update fails but we have questions, continue anyway
          // The questions are already in state and will be saved on publish
          console.warn('Draft update failed, but continuing:', error)
          if (error && error.message && !error.message.includes('not found')) {
            // Only show error if it's not a "not found" error (which we can recover from)
            setErrors({ submit: 'Warning: Could not save draft, but you can continue. Questions will be saved when you publish.' })
          }
        }
      }
      setCurrentStep(3)
    } catch (error) {
      console.error('Error saving questions:', error)
      setErrors({ submit: (error && error.message) || 'Failed to save questions.' })
    } finally {
      setLoading(false)
    }
  }

  const handleStep3Finish = async () => {
    const newErrors = {}

    if (!timeSettings.startsAt) {
      newErrors.startsAt = 'Start date and time is required'
    }

    if (!timeSettings.endsAt) {
      newErrors.endsAt = 'End date and time is required'
    }

    if (timeSettings.startsAt && timeSettings.endsAt) {
      const start = new Date(timeSettings.startsAt)
      const end = new Date(timeSettings.endsAt)
      const now = new Date()

      if (end <= start) {
        newErrors.endsAt = 'End time must be after start time'
      }

      // Allow past dates if editing an existing exam
      if (start < now && !initialExam) {
        newErrors.startsAt = 'Start time cannot be in the past'
      }

      // Duration is auto-calculated, so we just validate it's positive
      const diffMinutes = (end - start) / (1000 * 60)
      if (diffMinutes < 1) {
        newErrors.durationMin = 'Time range must be at least 1 minute'
      }
    }

    // Validate total points (auto-calculated from questions)
    if (questions.length === 0) {
      newErrors.questions = 'Please add at least one question'
    } else {
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)
      if (totalPoints < 1) {
        newErrors.pointsTotal = 'Total marks must be at least 1'
      }
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    try {
      const examData = {
        ...basicInfo,
        ...timeSettings,
        questions,
        startsAt: new Date(timeSettings.startsAt).toISOString(),
        endsAt: new Date(timeSettings.endsAt).toISOString(),
        settingsSummary: {
          strictMode: timeSettings.strictMode,
          attemptsLeft: timeSettings.attemptsLeft,
          allowedReRecords: timeSettings.allowedReRecords,
          instructions: basicInfo.instructions
        }
      }

      console.log("=== WIZARD: Publishing Exam ===");
      console.log("questions state:", questions);
      console.log("questions in examData:", examData.questions);
      console.log("examData:", examData);

      // If editing an existing exam, update it instead of publishing
      if (initialExam) {
        const { updateExam } = await import('../services/api')
        await updateExam(initialExam.id, examData)
      } else if (draftId) {
        await publishDraftExam(draftId, examData)
      } else {
        throw new Error('No draft or exam to publish/update')
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error publishing/updating exam:', error)
      setErrors({ submit: error.message || 'Failed to publish/update exam. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionsChange = (updatedQuestions) => {
    setQuestions(updatedQuestions)
    setErrors({})

    // Auto-calculate total points from questions
    if (updatedQuestions && updatedQuestions.length > 0) {
      const totalPoints = updatedQuestions.reduce((sum, q) => sum + (q.points || 1), 0)
      setTimeSettings(prev => ({ ...prev, pointsTotal: totalPoints }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Exam</h2>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === step
                        ? 'bg-blue-600 text-white'
                        : currentStep > step
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {currentStep > step ? <Check className="w-4 h-4" /> : step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`w-12 h-1 mx-1 ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <span className={currentStep === 1 ? 'font-semibold text-blue-600' : ''}>
                Basic Info
              </span>
              <span className={currentStep === 2 ? 'font-semibold text-blue-600' : ''}>
                Questions
              </span>
              <span className={currentStep === 3 ? 'font-semibold text-blue-600' : ''}>
                Time Settings
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Basic Information</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Exam Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={basicInfo.title}
                      onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="e.g., Introduction to Algorithms - Midterm"
                    />
                    {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Short Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={basicInfo.shortDescription}
                      onChange={(e) => setBasicInfo({ ...basicInfo, shortDescription: e.target.value })}
                      rows={3}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.shortDescription ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Brief description of the exam..."
                    />
                    {errors.shortDescription && (
                      <p className="text-red-600 text-sm mt-1">{errors.shortDescription}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Instructions <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <textarea
                      value={basicInfo.instructions}
                      onChange={(e) => setBasicInfo({ ...basicInfo, instructions: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Detailed instructions for students..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStep1Next}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Save as Draft & Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Questions */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Questions</h3>
                {errors.questions && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-800 text-sm">{errors.questions}</p>
                  </div>
                )}
                <QuestionBuilder
                  questions={questions}
                  onChange={handleQuestionsChange}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  disabled={loading || questions.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue to Time Settings
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Time Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Time & Settings</h3>
                <ExamTimeSettings
                  timeSettings={timeSettings}
                  onChange={setTimeSettings}
                  errors={errors}
                  questions={questions}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStep3Finish}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Publishing...' : 'Publish Exam'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

