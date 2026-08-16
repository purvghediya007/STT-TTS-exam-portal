import React, { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, ArrowLeft, Save, Check, BookmarkCheck } from 'lucide-react'
import { createDraftExam, updateDraftExam, publishDraftExam } from '../services/api'
import QuestionBuilder from './QuestionBuilder'
import ExamTimeSettings from './ExamTimeSettings'
import { formatDateTimeLocal } from '../utils/format'
import logger from '../utils/logger'

/**
 * Multi-step exam creation wizard
 * Step 1: Basic Info (Title, Description, Instructions)
 * Step 2: Questions (MCQ/Descriptive)
 * Step 3: Time Settings
 */
export default function ExamCreationWizard({ onClose, onSuccess, onDraftSaved, draft: initialDraft, exam: initialExam }) {
  const [currentStep, setCurrentStep] = useState(1)
  const wizardContainerRef = useRef(null)
  const [draftId, setDraftId] = useState(initialDraft?.id || initialExam?.id || null)
  const [loading, setLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSavedToast, setDraftSavedToast] = useState(false)
  const [errors, setErrors] = useState({})

  // Step 1: Basic Info - Load from draft/exam if available
  const [basicInfo, setBasicInfo] = useState({
    title: initialDraft?.title || initialExam?.title || '',
    shortDescription: initialDraft?.shortDescription || initialExam?.shortDescription || '',
    instructions: initialDraft?.instructions || initialExam?.instructions || '',
    branches: initialDraft?.branches || initialExam?.branches || [],
    semesters: initialDraft?.semesters || initialExam?.semesters || []
  })

  // Available options for branches and semesters
  const availableBranches = [
    'IT',
    'CE',
    'COE',
    'CSE (DS)',
    'ECE',
    'EIE',
    'EE',
    'ICT',
    'AM',
    'CHE',
    'IC',
    'ME',
    'PE',
    'SH'
  ];
  const availableSemesters = [1, 2, 3, 4, 5, 6, 7, 8]

  // Step 2: Questions - Load from draft/exam if available
  const [questions, setQuestions] = useState(initialDraft?.questions || initialExam?.questions || [])

  // Step 3: Time Settings - Load from exam/draft if available using local timezone
  const [timeSettings, setTimeSettings] = useState(() => {
    const sAt = formatDateTimeLocal(initialExam?.startsAt || initialDraft?.startsAt)
    const eAt = formatDateTimeLocal(initialExam?.endsAt || initialDraft?.endsAt)
    let dur = initialExam?.durationMin || initialDraft?.durationMin || 60
    if (sAt && eAt) {
      const start = new Date(sAt)
      const end = new Date(eAt)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        dur = Math.ceil((end - start) / (1000 * 60))
      }
    }
    let slotDur = initialExam?.slotDurationMin || initialDraft?.slotDurationMin || dur
    if (dur && slotDur > dur) {
      slotDur = dur
    }
    return {
      startsAt: sAt,
      endsAt: eAt,
      durationMin: dur,
      slotDurationMin: slotDur,
      timePerQuestionSec: initialExam?.timePerQuestionSec ?? initialDraft?.timePerQuestionSec ?? null,
      pointsTotal: initialExam?.pointsTotal || initialDraft?.pointsTotal || (questions.length > 0 ? questions.reduce((sum, q) => sum + (q.marks || 1), 0) : 100),
      attemptsLeft: initialExam?.attemptsLeft || initialDraft?.attemptsLeft || 1,
      allowedReRecords: initialExam?.allowedReRecords ?? initialDraft?.allowedReRecords ?? 0,
      strictMode: initialExam?.strictMode || initialDraft?.strictMode || false
    }
  })

  useEffect(() => {
    if (wizardContainerRef.current) {
      wizardContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  // If editing a draft or exam, synchronize state and set appropriate starting step
  useEffect(() => {
    if (initialDraft) {
      setDraftId(initialDraft.id)
      setBasicInfo({
        title: initialDraft.title || '',
        shortDescription: initialDraft.shortDescription || '',
        instructions: initialDraft.instructions || '',
        branches: initialDraft.branches || [],
        semesters: initialDraft.semesters || []
      })
      const draftQuestions = Array.isArray(initialDraft.questions) ? initialDraft.questions : []
      setQuestions(draftQuestions)
      if (initialDraft.startsAt || initialDraft.endsAt) {
        const sAt = formatDateTimeLocal(initialDraft.startsAt)
        const eAt = formatDateTimeLocal(initialDraft.endsAt)
        let dur = initialDraft.durationMin || 60
        if (sAt && eAt) {
          const start = new Date(sAt)
          const end = new Date(eAt)
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
            dur = Math.ceil((end - start) / (1000 * 60))
          }
        }
        let slotDur = initialDraft.slotDurationMin || dur
        if (dur && slotDur > dur) {
          slotDur = dur
        }
        setTimeSettings(prev => ({
          ...prev,
          startsAt: sAt || prev.startsAt,
          endsAt: eAt || prev.endsAt,
          durationMin: dur,
          slotDurationMin: slotDur,
          pointsTotal: initialDraft.pointsTotal || (draftQuestions.length > 0 ? draftQuestions.reduce((sum, q) => sum + (q.marks || 1), 0) : prev.pointsTotal)
        }))
      }
      if (draftQuestions.length > 0) {
        setCurrentStep(2)
      } else {
        setCurrentStep(1)
      }
    } else if (initialExam) {
      setDraftId(initialExam.id)
      setBasicInfo({
        title: initialExam.title || '',
        shortDescription: initialExam.shortDescription || '',
        instructions: initialExam.instructions || '',
        branches: initialExam.branches || [],
        semesters: initialExam.semesters || []
      })
      setQuestions(initialExam.questions || [])
      const sAt = formatDateTimeLocal(initialExam.startsAt)
      const eAt = formatDateTimeLocal(initialExam.endsAt)
      let dur = initialExam.durationMin || 60
      if (sAt && eAt) {
        const start = new Date(sAt)
        const end = new Date(eAt)
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
          dur = Math.ceil((end - start) / (1000 * 60))
        }
      }
      let slotDur = initialExam.slotDurationMin || dur
      if (dur && slotDur > dur) {
        slotDur = dur
      }
      setTimeSettings(prev => ({
        ...prev,
        startsAt: sAt || prev.startsAt,
        endsAt: eAt || prev.endsAt,
        durationMin: dur,
        slotDurationMin: slotDur,
        pointsTotal: initialExam.pointsTotal || prev.pointsTotal
      }))
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

  // Centralized draft persistence helper
  const saveCurrentDraft = async (overrides = {}) => {
    let teacherName = 'Current Faculty'
    try {
      const userData = JSON.parse(localStorage.getItem('user_data'))
      if (userData?.role === 'faculty') {
        teacherName = userData.name || userData.facultyId || 'Current Faculty'
      }
    } catch {
      // Ignore
    }

    const currentQuestions = overrides.questions !== undefined ? overrides.questions : questions
    const currentBasicInfo = {
      title: (overrides.title !== undefined ? overrides.title : basicInfo.title).trim(),
      shortDescription: (overrides.shortDescription !== undefined ? overrides.shortDescription : basicInfo.shortDescription).trim(),
      instructions: (overrides.instructions !== undefined ? overrides.instructions : basicInfo.instructions).trim() || null,
      branches: overrides.branches !== undefined ? overrides.branches : basicInfo.branches,
      semesters: overrides.semesters !== undefined ? overrides.semesters : basicInfo.semesters
    }

    const effectiveStartsAt = overrides.startsAt !== undefined ? overrides.startsAt : timeSettings.startsAt
    const effectiveEndsAt = overrides.endsAt !== undefined ? overrides.endsAt : timeSettings.endsAt

    const draftData = {
      ...currentBasicInfo,
      teacherName,
      status: 'draft',
      questions: currentQuestions || [],
      startsAt: effectiveStartsAt ? new Date(effectiveStartsAt).toISOString() : undefined,
      endsAt: effectiveEndsAt ? new Date(effectiveEndsAt).toISOString() : undefined,
      durationMin: overrides.durationMin !== undefined ? overrides.durationMin : timeSettings.durationMin,
      slotDurationMin: overrides.slotDurationMin !== undefined ? overrides.slotDurationMin : timeSettings.slotDurationMin,
      pointsTotal: currentQuestions && currentQuestions.length > 0
        ? currentQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)
        : (overrides.pointsTotal !== undefined ? overrides.pointsTotal : timeSettings.pointsTotal),
      timePerQuestionSec: overrides.timePerQuestionSec !== undefined ? overrides.timePerQuestionSec : timeSettings.timePerQuestionSec,
      attemptsLeft: overrides.attemptsLeft !== undefined ? overrides.attemptsLeft : timeSettings.attemptsLeft,
      allowedReRecords: overrides.allowedReRecords !== undefined ? overrides.allowedReRecords : timeSettings.allowedReRecords,
      strictMode: overrides.strictMode !== undefined ? overrides.strictMode : timeSettings.strictMode,
      ...overrides,
      createdAt: new Date().toISOString()
    }

    let result
    if (draftId && !initialExam) {
      result = await updateDraftExam(draftId, draftData)
    } else if (!initialExam) {
      result = await createDraftExam(draftData)
      if (result?.id) {
        setDraftId(result.id)
      }
    }
    return result
  }

  const handleStep1Next = async () => {
    if (!validateStep1()) return

    setLoading(true)
    try {
      const result = await saveCurrentDraft({ questions })
      if (result) {
        setCurrentStep(2)
      }
    } catch (error) {
      logger.error('Error saving draft:', error)
      setErrors({ submit: error.message || 'Failed to save draft. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Back = async () => {
    // Auto-save questions to draft when going back to step 1
    if (draftId && !initialExam) {
      try {
        await saveCurrentDraft({ questions })
      } catch (e) {
        logger.warn('Auto-saving draft questions on back failed:', e)
      }
    }
    setCurrentStep(1)
  }

  const handleStep2Next = async () => {
    if (questions.length === 0) {
      setErrors({ questions: 'Please add at least one question' })
      return
    }

    setLoading(true)
    try {
      if (draftId && !initialExam) {
        try {
          await saveCurrentDraft({ questions })
        } catch (error) {
          logger.warn('Draft update failed, but continuing:', error)
          if (error && error.message && !error.message.includes('not found')) {
            setErrors({ submit: 'Warning: Could not save draft, but you can continue. Questions will be saved when you publish.' })
          }
        }
      }
      setCurrentStep(3)
    } catch (error) {
      logger.error('Error saving questions:', error)
      setErrors({ submit: (error && error.message) || 'Failed to save questions.' })
    } finally {
      setLoading(false)
    }
  }

  const handleStep3Back = async () => {
    // Auto-save draft settings when going back to step 2
    if (draftId && !initialExam) {
      try {
        await saveCurrentDraft({ questions })
      } catch (e) {
        logger.warn('Auto-saving draft on back failed:', e)
      }
    }
    setCurrentStep(2)
  }

  const handleSaveDraftOnly = async () => {
    if (!basicInfo.title.trim()) {
      setErrors({ title: 'Title is required to save draft' })
      setCurrentStep(1)
      return
    }

    setSavingDraft(true)
    try {
      await saveCurrentDraft({ questions })
      setDraftSavedToast(true)
      setTimeout(() => {
        setDraftSavedToast(false)
      }, 3000)
      onDraftSaved?.()
    } catch (error) {
      logger.error('Error saving draft:', error)
      setErrors({ submit: error.message || 'Failed to save draft. Please try again.' })
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSaveDraftAndExit = async () => {
    if (!basicInfo.title.trim()) {
      setErrors({ title: 'Title is required to save draft' })
      setCurrentStep(1)
      return
    }

    setSavingDraft(true)
    try {
      await saveCurrentDraft({ questions })
      setDraftSavedToast(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 500)
    } catch (error) {
      logger.error('Error saving draft:', error)
      setErrors({ submit: error.message || 'Failed to save draft. Please try again.' })
    } finally {
      setSavingDraft(false)
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

      // Validate slot duration
      if (!timeSettings.slotDurationMin || timeSettings.slotDurationMin <= 0) {
        newErrors.slotDurationMin = 'Student slot duration must be greater than 0'
      } else if (timeSettings.slotDurationMin > diffMinutes) {
        newErrors.slotDurationMin = `Slot duration cannot be greater than exam window (${Math.floor(diffMinutes)} minutes)`
      }
    }

    // Validate total points (auto-calculated from questions)
    if (questions.length === 0) {
      newErrors.questions = 'Please add at least one question'
    } else {
      const totalPoints = questions.reduce((sum, q) => sum + (q.marks || 1), 0)
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
        branches: basicInfo.branches,
        semesters: basicInfo.semesters,
        questions,
        startsAt: new Date(timeSettings.startsAt).toISOString(),
        endsAt: new Date(timeSettings.endsAt).toISOString(),
        slotDurationMin: timeSettings.slotDurationMin,
        settingsSummary: {
          strictMode: timeSettings.strictMode,
          attemptsLeft: timeSettings.attemptsLeft,
          allowedReRecords: timeSettings.allowedReRecords,
          instructions: basicInfo.instructions
        }
      }

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
      logger.error('Error publishing/updating exam:', error)
      setErrors({ submit: error.message || 'Failed to publish/update exam. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionsChange = (updatedQuestions) => {
    setQuestions(updatedQuestions)
    setErrors({})

    // Auto-calculate total points from questions (use 'marks' field from QuestionBuilder)
    if (updatedQuestions && updatedQuestions.length > 0) {
      const totalPoints = updatedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)
      setTimeSettings(prev => ({ ...prev, pointsTotal: totalPoints }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={wizardContainerRef} className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {initialExam ? 'Edit Exam' : draftId ? 'Edit Draft Exam' : 'Create New Exam'}
            </h2>
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
                Questions ({questions.length})
              </span>
              <span className={currentStep === 3 ? 'font-semibold text-blue-600' : ''}>
                Time Settings
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!initialExam && (
              <button
                type="button"
                onClick={handleSaveDraftOnly}
                disabled={savingDraft || loading}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-200 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingDraft ? 'Saving Draft...' : 'Save Draft'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {draftSavedToast && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center gap-2 text-green-800 text-sm font-medium">
              <BookmarkCheck className="w-4 h-4 text-green-600" />
              Draft saved successfully!
            </div>
          )}

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

                  {/* Branch Selection */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        Select Applicable Branches
                      </label>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        Leave empty for All Branches
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {availableBranches.map((branch) => (
                        <label
                          key={branch}
                          className="flex items-center gap-2 p-3 transition-all duration-200 cursor-pointer"
                          style={{
                            border: basicInfo.branches.includes(branch)
                              ? '2px solid var(--accent)'
                              : '1px solid var(--border)',
                            borderRadius: '18px',
                            backgroundColor: basicInfo.branches.includes(branch)
                              ? 'var(--accent-light)'
                              : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={basicInfo.branches.includes(branch)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBasicInfo({
                                  ...basicInfo,
                                  branches: [...basicInfo.branches, branch]
                                })
                              } else {
                                setBasicInfo({
                                  ...basicInfo,
                                  branches: basicInfo.branches.filter(b => b !== branch)
                                })
                              }
                            }}
                            className="w-4 h-4 rounded cursor-pointer"
                            style={{ accentColor: 'var(--accent)' }}
                          />
                          <span className="text-sm font-medium" style={{
                            color: basicInfo.branches.includes(branch) ? 'var(--accent)' : 'var(--text)'
                          }}>
                            {branch}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
                      {basicInfo.branches.length === 0
                        ? '✓ All branches will have access'
                        : `✓ Selected: ${basicInfo.branches.join(', ')}`}
                    </p>
                  </div>

                  {/* Semester Selection */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        Select Applicable Semesters
                      </label>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        Leave empty for All Semesters
                      </span>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {availableSemesters.map((semester) => (
                        <label
                          key={semester}
                          className="flex items-center gap-2 p-2 transition-all duration-200 cursor-pointer font-medium min-h-[2.5rem]"
                          style={{
                            border: basicInfo.semesters.includes(semester)
                              ? '2px solid var(--accent-strong)'
                              : '1px solid var(--border)',
                            borderRadius: '18px',
                            backgroundColor: basicInfo.semesters.includes(semester)
                              ? 'rgba(124, 58, 237, 0.12)'
                              : 'transparent',
                            color: basicInfo.semesters.includes(semester)
                              ? 'var(--accent-strong)'
                              : 'var(--text)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={basicInfo.semesters.includes(semester)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBasicInfo({
                                  ...basicInfo,
                                  semesters: [...basicInfo.semesters, semester].sort((a, b) => a - b)
                                })
                              } else {
                                setBasicInfo({
                                  ...basicInfo,
                                  semesters: basicInfo.semesters.filter(s => s !== semester)
                                })
                              }
                            }}
                            className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
                            style={{ accentColor: 'var(--accent-strong)' }}
                          />
                          <span className="text-sm">{semester}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
                      {basicInfo.semesters.length === 0
                        ? '✓ All semesters will have access'
                        : `✓ Selected: Semester ${basicInfo.semesters.join(', ')}`}
                    </p>
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
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
                  onClick={handleStep2Back}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  {!initialExam && (
                    <button
                      type="button"
                      onClick={handleSaveDraftAndExit}
                      disabled={savingDraft || loading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Save className="w-4 h-4 text-blue-600" />
                      {savingDraft ? 'Saving Draft...' : 'Save Draft & Exit'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStep2Next}
                    disabled={loading || questions.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    Continue to Time Settings
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
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
                  onClick={handleStep3Back}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  {!initialExam && (
                    <button
                      type="button"
                      onClick={handleSaveDraftAndExit}
                      disabled={savingDraft || loading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Save className="w-4 h-4 text-blue-600" />
                      {savingDraft ? 'Saving Draft...' : 'Save Draft & Exit'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStep3Finish}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? (initialExam ? 'Updating Exam...' : 'Publishing...') : (initialExam ? 'Update Exam' : 'Publish Exam')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

