import React, { useState } from 'react'
import { Plus, Trash2, Image, Video, FileText, X, Check, Upload } from 'lucide-react'
import { uploadMedia, deleteMedia } from '../services/api'

/**
 * QuestionBuilder - Component for building MCQ, Viva, and Interview questions
 * Supports: mcq (with 2-4 options), short_answer, long_answer
 */
export default function QuestionBuilder({ questions, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [uploadingMedia, setUploadingMedia] = useState(null) // Track which media type is uploading
  const [newQuestion, setNewQuestion] = useState({
    type: 'mcq', // Default to MCQ for the merged component
    text: '', // Changed from 'question' to match backend
    options: ['', '', '', ''], // MCQ field
    correctAnswer: null, // MCQ field (index of correct option)
    marks: 1, // Changed from 'points' to match backend
    expectedAnswer: '', // For descriptive questions
    media: {
      image: null,
      video: null,
      graph: null
    },
    // Frontend-only fields for new modes
    // File upload mode
    file: null,
    fileDescription: '',
    // Topic based generation mode
    topicName: '',
    difficulty: 'Easy',
    numQuestions: 1,
    questionTypesToGenerate: ['mcq'],
    topicWeights: { mcq: 0, viva: 0, interview: 0 }
  })
  


  // Handler for media uploads to Cloudinary
  const handleMediaUpload = async (type, file) => {
    if (!file) return

    setUploadingMedia(type)
    try {
      console.log(`Starting upload for ${type}:`, file.name)
      const uploadResult = await uploadMedia(file)
      console.log(`Upload result for ${type}:`, uploadResult)

      if (!uploadResult.url) {
        throw new Error(`Upload failed: No URL returned. Response: ${JSON.stringify(uploadResult)}`)
      }

      setNewQuestion(prev => ({
        ...prev,
        media: {
          ...prev.media,
          [type]: {
            file: file.name,
            url: uploadResult.url,
            public_id: uploadResult.public_id,
            size: uploadResult.size,
            type: uploadResult.mimetype
          }
        }
      }))
      console.log(`Media uploaded successfully for ${type}`)
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      alert(`Failed to upload ${type}: ${error.message}`)
    } finally {
      setUploadingMedia(null)
    }
  }

  // Helper function to reset the state to the default new question state
  const resetNewQuestionState = () => ({
    type: 'mcq',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: null,
    marks: 1,
    expectedAnswer: '',
    media: { image: null, video: null, graph: null },
    // Frontend-only defaults
    file: null,
    fileDescription: '',
    topicName: '',
    difficulty: 'Easy',
    numQuestions: 1,
    questionTypesToGenerate: ['mcq'],
    topicWeights: { mcq: 0, viva: 0, interview: 0 }
  })

  // Function to update state on type change, clearing irrelevant fields
  const handleTypeChange = (newType) => {
    setNewQuestion(prev => ({
      ...prev,
      type: newType,
      // Clear MCQ specific fields if switching away from MCQ
      options: newType === 'mcq' ? prev.options : ['', '', '', ''],
      correctAnswer: newType === 'mcq' ? prev.correctAnswer : null,
      // Clear media when switching to modes that don't use it
      media: (newType === 'mcq' || newType === 'viva' || newType === 'interview') ? prev.media : { image: null, video: null, graph: null },
      // File upload specific
      file: newType === 'file_upload' ? prev.file : null,
      fileDescription: newType === 'file_upload' ? prev.fileDescription : '',
      // Topic based specific
      topicName: newType === 'topic_based' ? prev.topicName : '',
      difficulty: newType === 'topic_based' ? prev.difficulty : 'Easy',
      numQuestions: newType === 'topic_based' ? prev.numQuestions : 1,
      questionTypesToGenerate: newType === 'topic_based' ? prev.questionTypesToGenerate : ['mcq'],
      topicWeights: newType === 'topic_based' ? prev.topicWeights : { mcq: 0, viva: 0, interview: 0 }
    }))
  }

  // Toggle which question types will be generated for topic_based and adjust weights
  const handleToggleQuestionType = (type) => {
    setNewQuestion(prev => {
      const prevTypes = Array.isArray(prev.questionTypesToGenerate) ? prev.questionTypesToGenerate : []
      const selected = prevTypes.includes(type)
      const newTypes = selected ? prevTypes.filter(t => t !== type) : [...prevTypes, type]

      // compute new weights
      let newWeights = { ...(prev.topicWeights || { mcq: 0, viva: 0, interview: 0 }) }

      if (newTypes.length === 0) {
        newWeights = { mcq: 0, viva: 0, interview: 0 }
      } else if (newTypes.length === 1) {
        // single selection gets 100%
        newWeights = { mcq: 0, viva: 0, interview: 0 }
        newWeights[newTypes[0]] = 100
      } else {
        // multiple selection: per requested behavior, start selected types at 0%
        // and keep unselected types at 0% (user will distribute manually)
        newWeights = { mcq: 0, viva: 0, interview: 0 }
        newTypes.forEach(t => {
          newWeights[t] = 0
        })
      }

      return { ...prev, questionTypesToGenerate: newTypes, topicWeights: newWeights }
    })
  }

  const handleAddQuestion = () => {
    // For file_upload and topic_based modes question text is optional
    if (newQuestion.type !== 'file_upload' && newQuestion.type !== 'topic_based' && !newQuestion.text.trim()) {
      alert('Please enter a question')
      return
    }

    if (newQuestion.type === 'mcq') {
      const validOptions = newQuestion.options.filter(opt => opt.trim())
      if (validOptions.length < 2) {
        alert('Please provide at least 2 options (minimum 2)')
        return
      }
      if (validOptions.length > 4) {
        alert('Too many options (maximum 4 allowed)')
        return
      }

      if (newQuestion.correctAnswer === null || newQuestion.options[newQuestion.correctAnswer].trim() === '') {
        alert('Please select the correct answer')
        return
      }
    }

    const question = {
      id: `Q${Date.now()}`,
      type: newQuestion.type,
      text: newQuestion.text.trim(),
      marks: newQuestion.marks || 1,
      expectedAnswer: newQuestion.expectedAnswer || '',
      ...(newQuestion.type === 'mcq' && {
        options: newQuestion.options
          .filter(opt => opt.trim())
          .map((text, index) => ({
            text: text.trim(),
            isCorrect: index === newQuestion.correctAnswer
          }))
      }),
      media: { ...newQuestion.media },
      // Frontend-only: include uploaded file metadata for file_upload
      ...(newQuestion.type === 'file_upload' && {
        file: newQuestion.file ? { name: newQuestion.file.name, size: newQuestion.file.size, type: newQuestion.file.type } : null,
        fileDescription: newQuestion.fileDescription || ''
      }),
      // Frontend-only: include topic based configuration
      ...(newQuestion.type === 'topic_based' && {
        topicName: newQuestion.topicName || '',
        difficulty: newQuestion.difficulty || 'Easy',
        numQuestions: newQuestion.numQuestions || 1,
        questionTypesToGenerate: newQuestion.questionTypesToGenerate || ['mcq'],
        topicWeights: newQuestion.topicWeights || { mcq: 0, viva: 0, interview: 0 }
      })
    }

    const updatedQuestions = [...questions, question]
    onChange(updatedQuestions)

    // Reset form
    setNewQuestion(resetNewQuestionState())
    setEditingIndex(null)
  }

  const handleUpdateQuestion = (index) => {
    const questionToUpdate = questions[index]

    // For file_upload and topic_based modes question text is optional
    if (newQuestion.type !== 'file_upload' && newQuestion.type !== 'topic_based' && !newQuestion.text.trim()) {
      alert('Please enter a question')
      return
    }

    if (newQuestion.type === 'mcq') {
      const validOptions = newQuestion.options.filter(opt => opt.trim())
      if (validOptions.length < 2) {
        alert('Please provide at least 2 options')
        return
      }

      if (newQuestion.correctAnswer === null || newQuestion.options[newQuestion.correctAnswer].trim() === '') {
        alert('Please select the correct answer')
        return
      }
    }

    const updated = {
      ...questionToUpdate,
      type: newQuestion.type,
      text: newQuestion.text.trim(),
      marks: newQuestion.marks || 1,
      expectedAnswer: newQuestion.expectedAnswer || '',
      ...(newQuestion.type === 'mcq' && {
        options: newQuestion.options
          .filter(opt => opt.trim())
          .map((text, optIndex) => ({
            text: text.trim(),
            isCorrect: optIndex === newQuestion.correctAnswer
          }))
      }),
      media: { ...newQuestion.media },
      ...(newQuestion.type === 'file_upload' && {
        file: newQuestion.file ? { name: newQuestion.file.name, size: newQuestion.file.size, type: newQuestion.file.type } : null,
        fileDescription: newQuestion.fileDescription || ''
      }),
      ...(newQuestion.type === 'topic_based' && {
        topicName: newQuestion.topicName || '',
        difficulty: newQuestion.difficulty || 'Easy',
        numQuestions: newQuestion.numQuestions || 1,
        questionTypesToGenerate: newQuestion.questionTypesToGenerate || ['mcq'],
        topicWeights: newQuestion.topicWeights || { mcq: 0, viva: 0, interview: 0 }
      })
    }

    const updatedQuestions = [...questions]
    updatedQuestions[index] = updated
    onChange(updatedQuestions)

    setEditingIndex(null)
    setNewQuestion(resetNewQuestionState())
  }

  const handleDeleteQuestion = (index) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const updatedQuestions = questions.filter((_, i) => i !== index)
      onChange(updatedQuestions)
    }
  }
  const handleEditQuestion = (index) => {
    const question = questions[index]
    setEditingIndex(index)

    let options = ['', '', '', '']
    let correctAnswer = null

    if (question.type === 'mcq' && question.options) {
      // Convert options back to text array for editing
      options = question.options.map(opt => opt.text)
      correctAnswer = question.options.findIndex(opt => opt.isCorrect)
    }

    setNewQuestion({
      type: question.type || 'mcq',
      text: question.text,
      options: options,
      correctAnswer: correctAnswer,
      marks: question.marks || 1,
      expectedAnswer: question.expectedAnswer || '',
      media: question.media || { image: null, video: null, graph: null },
      // Load frontend-only fields if present
      file: question.file || null,
      fileDescription: question.fileDescription || '',
      topicName: question.topicName || '',
      difficulty: question.difficulty || 'Easy',
      numQuestions: question.numQuestions || 1,
      questionTypesToGenerate: question.questionTypesToGenerate || (question.questionTypeToGenerate ? [question.questionTypeToGenerate] : ['mcq']),
      topicWeights: question.topicWeights || { mcq: 0, viva: 0, interview: 0 }
    })
  }

  const handleRemoveMedia = (type) => {
    const mediaItem = newQuestion.media[type]

    // Delete from Cloudinary if it has a public_id
    if (mediaItem?.public_id) {
      deleteMedia(mediaItem.public_id).catch(error => {
        console.error(`Error deleting ${type} from Cloudinary:`, error)
      })
    }

    setNewQuestion(prev => ({
      ...prev,
      media: {
        ...prev.media,
        [type]: null
      }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Existing Questions */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Questions ({questions.length})</h4>
          {questions.map((q, index) => (
            <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${q.type === 'mcq' ? 'bg-green-100 text-green-700' :
                      q.type === 'interview' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                      {q.type.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">{q.marks} point{q.marks !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-gray-900 font-medium">{q.text}</p>

                  {/* MCQ Options Display */}
                  {q.type === 'mcq' && q.options && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2 text-sm">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${opt.isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                            }`}>
                            {opt.isCorrect ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className={opt.isCorrect ? 'font-semibold text-green-700' : 'text-gray-700'}>
                            {opt.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(q.media?.image || q.media?.video || q.media?.graph) && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      {q.media.image && <Image className="w-4 h-4" />}
                      {q.media.video && <Video className="w-4 h-4" />}
                      {q.media.graph && <FileText className="w-4 h-4" />}
                      <span>Media attached</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditQuestion(index)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Question Form */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
        <h4 className="font-semibold text-gray-700 mb-4">
          {editingIndex !== null ? 'Edit Question' : 'Add New Question'}
        </h4>

        {/* Question Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type</label>
          <div className="flex items-center gap-3 flex-wrap">
            <label className={`px-3 py-1 rounded-lg border cursor-pointer ${newQuestion.type === 'mcq' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
              <input
                type="radio"
                name="questionType"
                value="mcq"
                checked={newQuestion.type === 'mcq'}
                onChange={() => handleTypeChange('mcq')}
                className="mr-2"
              />
              MCQ
            </label>
            <label className={`px-3 py-1 rounded-lg border cursor-pointer ${newQuestion.type === 'viva' ? 'bg-pink-100 border-pink-300 text-pink-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
              <input
                type="radio"
                name="questionType"
                value="viva"
                checked={newQuestion.type === 'viva'}
                onChange={() => handleTypeChange('viva')}
                className="mr-2"
              />
              Viva
            </label>
            <label className={`px-3 py-1 rounded-lg border cursor-pointer ${newQuestion.type === 'interview' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
              <input
                type="radio"
                name="questionType"
                value="interview"
                checked={newQuestion.type === 'interview'}
                onChange={() => handleTypeChange('interview')}
                className="mr-2"
              />
              Interview
            </label>
            <label className={`px-3 py-1 rounded-lg border cursor-pointer ${newQuestion.type === 'file_upload' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
              <input
                type="radio"
                name="questionType"
                value="file_upload"
                checked={newQuestion.type === 'file_upload'}
                onChange={() => handleTypeChange('file_upload')}
                className="mr-2"
              />
              File / Excel Upload
            </label>
            <label className={`px-3 py-1 rounded-lg border cursor-pointer ${newQuestion.type === 'topic_based' ? 'bg-teal-100 border-teal-300 text-teal-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
              <input
                type="radio"
                name="questionType"
                value="topic_based"
                checked={newQuestion.type === 'topic_based'}
                onChange={() => handleTypeChange('topic_based')}
                className="mr-2"
              />
              Topic Based (AI Generated)
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {newQuestion.type === 'mcq' && 'Students select one correct option from a list.'}
            {newQuestion.type === 'viva' && 'Student records a spoken/video answer.'}
            {newQuestion.type === 'interview' && 'Interview-style prompt; student records their response.'}
            {newQuestion.type === 'file_upload' && 'Faculty can upload question banks. AI processing will be handled later.'}
            {newQuestion.type === 'topic_based' && 'Questions will be generated automatically by AI during exam creation.'}
          </p>
        </div>

        {/* Question Text (hidden for file_upload and topic_based) */}
        {newQuestion.type !== 'file_upload' && newQuestion.type !== 'topic_based' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newQuestion.text}
              onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your question here..."
            />
          </div>
        )}

        {/* --- MCQ Options Input --- */}
        {newQuestion.type === 'mcq' && (
          <div className="mb-4 space-y-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Options <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(Provide at least 2 non-empty, unique options)</span>
            </label>
            {newQuestion.options.map((opt, index) => {
              // Check if this option duplicates another (real-time feedback)
              const trimmedOpt = opt.trim().toLowerCase()
              const hasDuplicate = trimmedOpt !== '' && newQuestion.options.some((o, i) => i !== index && o.trim().toLowerCase() === trimmedOpt)

              return (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${newQuestion.correctAnswer === index
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                    }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options]
                        newOptions[index] = e.target.value
                        setNewQuestion({ ...newQuestion, options: newOptions })
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasDuplicate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                    {hasDuplicate && (
                      <p className="text-red-600 text-xs mt-1">This option is a duplicate</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: index })}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors flex-shrink-0 ${newQuestion.correctAnswer === index
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {newQuestion.correctAnswer === index ? 'Correct' : 'Mark Correct'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {/* --- End MCQ Options Input --- */}

        {/* File / Excel Upload UI (frontend-only) */}
        {newQuestion.type === 'file_upload' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Upload PDF or Excel containing Questions & Answers</label>

            <label htmlFor="file-upload-input" className="border-2 border-dashed border-gray-300 rounded-md p-4 flex items-center gap-4 cursor-pointer">
              <div className="flex-shrink-0">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Click to select a file</div>
                <div className="text-xs text-gray-500">Accepted: .pdf, .xlsx, .xls, .csv</div>
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
                  onChange={(e) => {
                    const f = e.target.files[0]
                    setNewQuestion(prev => ({ ...prev, file: f || null }))
                  }}
                  className="hidden"
                />

                {newQuestion.file ? (
                  <div className="mt-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <div className="text-sm text-gray-800 truncate">{newQuestion.file.name}</div>
                      <div className="text-xs text-gray-500">{Math.round((newQuestion.file.size || 0) / 1024)} KB</div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setNewQuestion(prev => ({ ...prev, file: null })) }}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">No file selected</div>
                )}
              </div>
            </label>

            <textarea
              placeholder="Optional instructions for this upload"
              value={newQuestion.fileDescription}
              onChange={(e) => setNewQuestion({ ...newQuestion, fileDescription: e.target.value })}
              rows={3}
              className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">Faculty can upload question banks. AI processing will be handled later.</p>
          </div>
        )}

        {/* Topic Based (AI Generated) UI (frontend-only) */}
        {newQuestion.type === 'topic_based' && (
          <div className="mb-4 space-y-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Topic Based Configuration</label>

            <div className="space-y-2">
              <label className="block text-xs text-gray-600">Topic Name</label>
              <input
                type="text"
                placeholder="e.g. Data Structures – Stack & Queue"
                value={newQuestion.topicName}
                onChange={(e) => setNewQuestion({ ...newQuestion, topicName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-2">Difficulty Level</label>
                <div className="flex items-center gap-2">
                  {['Easy','Medium','Hard'].map(level => (
                    <label key={level} className={`px-3 py-1 rounded-lg border cursor-pointer text-sm ${newQuestion.difficulty === level ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
                      <input
                        type="radio"
                        name="difficulty"
                        value={level}
                        checked={newQuestion.difficulty === level}
                        onChange={() => setNewQuestion(prev => ({ ...prev, difficulty: level }))}
                        className="mr-2"
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-2">Number of Questions</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newQuestion.numQuestions}
                  onChange={(e) => setNewQuestion({ ...newQuestion, numQuestions: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="1 - 50"
                />
                <p className="text-xs text-gray-400 mt-1">How many questions to generate for this topic</p>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-2">Question Type to Generate</label>
                <div className="flex items-center gap-2">
                  {[
                    {value: 'mcq', label: 'MCQ'},
                    {value: 'viva', label: 'Viva'},
                    {value: 'interview', label: 'Interview'}
                  ].map(opt => {
                    const selected = Array.isArray(newQuestion.questionTypesToGenerate) && newQuestion.questionTypesToGenerate.includes(opt.value)
                    return (
                      <label key={opt.value} className={`px-3 py-1 rounded-lg border cursor-pointer text-sm ${selected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
                        <input
                          type="checkbox"
                          name="questionTypesToGenerate"
                          value={opt.value}
                          checked={selected}
                          onChange={() => handleToggleQuestionType(opt.value)}
                          className="mr-2"
                        />
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1">Choose the format for generated questions</p>
              </div>
              {/* Weight distribution for selected types */}
              <div className="sm:col-span-3 mt-3">
                <label className="block text-xs text-gray-600 mb-2">Weight Distribution (%)</label>
                <div className="w-full bg-gray-100 rounded-md h-4 overflow-hidden flex">
                  <div style={{ width: `${newQuestion.topicWeights.mcq}%` }} className="bg-green-400 h-4" />
                  <div style={{ width: `${newQuestion.topicWeights.viva}%` }} className="bg-pink-400 h-4" />
                  <div style={{ width: `${newQuestion.topicWeights.interview}%` }} className="bg-indigo-400 h-4" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {['mcq','viva','interview'].map((t) => {
                    const isSelected = Array.isArray(newQuestion.questionTypesToGenerate) && newQuestion.questionTypesToGenerate.includes(t)
                    const othersSum = Object.keys(newQuestion.topicWeights || {}).reduce((s,k)=> k===t? s : s + (newQuestion.topicWeights[k]||0), 0)
                    const max = isSelected ? Math.max(0, 100 - othersSum) : 0
                    return (
                      <div key={t} className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">{t.toUpperCase()}</label>
                        <input
                          type="range"
                          min="0"
                          max={max}
                          value={isSelected ? (newQuestion.topicWeights[t] || 0) : 0}
                          onChange={(e) => {
                            if (!isSelected) return
                            const val = Math.max(0, Math.min(parseInt(e.target.value)||0, 100))
                            setNewQuestion(prev => ({ ...prev, topicWeights: { ...prev.topicWeights, [t]: val } }))
                          }}
                          className={`w-full ${!isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!isSelected}
                        />
                        <div className="text-xs text-gray-600 mt-1">{isSelected ? (newQuestion.topicWeights[t] || 0) : 0}%</div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">Total: {(newQuestion.topicWeights.mcq||0)+(newQuestion.topicWeights.viva||0)+(newQuestion.topicWeights.interview||0)}% — remaining {100 - ((newQuestion.topicWeights.mcq||0)+(newQuestion.topicWeights.viva||0)+(newQuestion.topicWeights.interview||0))}%</p>
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500">Questions will be generated automatically by AI during exam creation.</p>
          </div>
        )}


        {/* Points */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Marks
          </label>
          <input
            type="number"
            min="1"
            value={newQuestion.marks}
            onChange={(e) => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) || 1 })}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Media Upload (shown only for mcq/viva/interview) */}
        {(newQuestion.type === 'mcq' || newQuestion.type === 'viva' || newQuestion.type === 'interview') && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Media Attachments <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
            {/* Image */}
            <label className="block border border-gray-300 rounded-lg p-4 min-h-[110px] cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-6 h-6 text-blue-600" />
                    <span className="text-xs text-gray-600">{uploadingMedia === 'image' ? 'Uploading...' : 'Image'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {newQuestion.media.image ? (
                      <span className="text-xs text-green-600 truncate max-w-[140px] text-right" title={newQuestion.media.image.file}>{newQuestion.media.image.file}</span>
                    ) : (
                      <span className="text-xs text-gray-400">No file</span>
                    )}
                    <span className="w-4 h-4 inline-flex items-center justify-center">
                      {uploadingMedia === 'image' ? (
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                      ) : (
                        <span className="inline-block w-4 h-4" />
                      )}
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMediaUpload('image', e.target.files[0])}
                  className="hidden"
                  disabled={uploadingMedia !== null}
                />

                {newQuestion.media.image && (
                  <div className="mt-3 flex items-start gap-3">
                    <img src={newQuestion.media.image.url} alt="preview" className="w-36 md:w-44 h-28 md:h-32 object-cover rounded-md border border-slate-100" />
                    <div className="flex-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveMedia('image') }}
                        className="text-red-600 hover:text-red-700 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-xs">Remove</span>
                      </button>
                    </div>
                  </div>
                )}
            </label>

            {/* Video */}
            <label className="block border border-gray-300 rounded-lg p-4 min-h-[110px] cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-6 h-6 text-blue-600" />
                    <span className="text-xs text-gray-600">{uploadingMedia === 'video' ? 'Uploading...' : 'Video'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {newQuestion.media.video ? (
                      <span className="text-xs text-green-600 truncate max-w-[140px] text-right" title={newQuestion.media.video.file}>{newQuestion.media.video.file}</span>
                    ) : (
                      <span className="text-xs text-gray-400">No file</span>
                    )}
                    <span className="w-4 h-4 inline-flex items-center justify-center">
                      {uploadingMedia === 'video' ? (
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                      ) : (
                        <span className="inline-block w-4 h-4" />
                      )}
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleMediaUpload('video', e.target.files[0])}
                  className="hidden"
                  disabled={uploadingMedia !== null}
                />

                {newQuestion.media.video && (
                  <div className="mt-3 flex items-start gap-3">
                    <video src={newQuestion.media.video.url} controls className="w-48 md:w-56 h-32 md:h-36 object-cover rounded-md border border-slate-100" />
                    <div className="flex-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveMedia('video') }}
                        className="text-red-600 hover:text-red-700 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-xs">Remove</span>
                      </button>
                    </div>
                  </div>
                )}
            </label>

            {/* Graph/Chart */}
            <label className="block border border-gray-300 rounded-lg p-4 min-h-[110px] cursor-pointer">
              {newQuestion.type === 'interview' ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <span className="text-xs text-gray-600">Attach File</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {newQuestion.media.graph ? (
                      <span className="text-xs text-green-600 truncate max-w-[140px] text-right" title={newQuestion.media.graph.file}>{newQuestion.media.graph.file}</span>
                    ) : (
                      <span className="text-xs text-gray-400">No file</span>
                    )}
                    <span className="w-4 h-4 inline-flex items-center justify-center" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <span className="text-xs text-gray-600">{uploadingMedia === 'graph' ? 'Uploading...' : 'Graph/Chart'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {newQuestion.media.graph ? (
                      <span className="text-xs text-green-600 truncate max-w-[140px] text-right" title={newQuestion.media.graph.file}>{newQuestion.media.graph.file}</span>
                    ) : (
                      <span className="text-xs text-gray-400">No file</span>
                    )}
                    <span className="w-4 h-4 inline-flex items-center justify-center">
                      {uploadingMedia === 'graph' ? (
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                      ) : (
                        <span className="inline-block w-4 h-4" />
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Input: interview uses local file, others use handleMediaUpload */}
              {newQuestion.type === 'interview' ? (
                <>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv"
                    onChange={(e) => {
                      const f = e.target.files[0]
                      setNewQuestion(prev => ({ ...prev, media: { ...prev.media, graph: f ? { file: f.name, size: f.size, type: f.type } : null } }))
                    }}
                    className="hidden"
                  />

                  {newQuestion.media.graph && (
                    <div className="mt-3 flex items-start gap-3">
                      <div className="w-36 md:w-44 h-28 md:h-32 flex items-center justify-center bg-slate-50 rounded-md border border-slate-100">
                        <FileText className="w-10 h-10 text-slate-400" />
                      </div>
                      <div className="flex-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setNewQuestion(prev => ({ ...prev, media: { ...prev.media, graph: null } })) }}
                          className="text-red-600 hover:text-red-700 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          <span className="text-xs">Remove</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleMediaUpload('graph', e.target.files[0])}
                    className="hidden"
                    disabled={uploadingMedia !== null}
                  />

                  {newQuestion.media.graph && (
                    <div className="mt-3 flex items-start gap-3">
                      <div className="w-36 md:w-44 h-28 md:h-32 flex items-center justify-center bg-slate-50 rounded-md border border-slate-100">
                        <FileText className="w-10 h-10 text-slate-400" />
                      </div>
                      <div className="flex-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveMedia('graph') }}
                          className="text-red-600 hover:text-red-700 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          <span className="text-xs">Remove</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </label>
          </div>
        </div>
      )}   {/* ✅ FIX: CLOSE CONDITIONAL HERE */}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          {editingIndex !== null && (
            <button
              type="button"
              onClick={() => {
                setEditingIndex(null)
                setNewQuestion(resetNewQuestionState())
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="button"
            onClick={editingIndex !== null
              ? () => handleUpdateQuestion(editingIndex)
              : handleAddQuestion}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {editingIndex !== null ? 'Update Question' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  )
}