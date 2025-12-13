import React, { useState } from 'react'
import { Plus, Trash2, Image, Video, FileText, X, Check } from 'lucide-react'

/**
 * QuestionBuilder - Component for building MCQ, Viva, and Interview questions
 */
export default function QuestionBuilder({ questions, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [newQuestion, setNewQuestion] = useState({
    type: 'mcq', // Default to MCQ for the merged component
    question: '',
    options: ['', '', '', ''], // MCQ field
    correctAnswer: null, // MCQ field
    points: 1,
    media: {
      image: null,
      video: null,
      graph: null
    }
  })

  // Helper function to reset the state to the default new question state
  const resetNewQuestionState = () => ({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: null,
    points: 1,
    media: { image: null, video: null, graph: null }
  })

  // Function to update state on type change, clearing irrelevant fields
  const handleTypeChange = (newType) => {
    setNewQuestion(prev => ({
        ...prev,
        type: newType,
        // Clear MCQ specific fields if switching away from MCQ
        options: newType === 'mcq' ? prev.options : ['', '', '', ''],
        correctAnswer: newType === 'mcq' ? prev.correctAnswer : null,
    }))
  }

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      alert('Please enter a question')
      return
    }

    if (newQuestion.type === 'mcq') {
      const validOptions = newQuestion.options.filter(opt => opt.trim())
      if (validOptions.length < 2) {
        alert('Please provide at least 2 options')
        return
      }
      
      // Check for duplicate options
      const optionSet = new Set(validOptions.map(opt => opt.trim().toLowerCase()))
      if (optionSet.size !== validOptions.length) {
        alert('Please ensure all options are different. Duplicate answers are not allowed.')
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
      question: newQuestion.question.trim(),
      points: newQuestion.points || 1,
      ...(newQuestion.type === 'mcq' && {
        options: newQuestion.options.filter(opt => opt.trim()),
        correctAnswer: newQuestion.correctAnswer
      }),
      media: { ...newQuestion.media }
    }

    const updatedQuestions = [...questions, question]
    onChange(updatedQuestions)
    
    // Reset form
    setNewQuestion(resetNewQuestionState())
    setEditingIndex(null)
  }

  const handleUpdateQuestion = (index) => {
    const questionToUpdate = questions[index]

    if (!newQuestion.question.trim()) {
        alert('Please enter a question')
        return
    }
    
    if (newQuestion.type === 'mcq') {
        const validOptions = newQuestion.options.filter(opt => opt.trim())
        if (validOptions.length < 2) {
            alert('Please provide at least 2 options')
            return
        }
        
        // Validate MCQ options for duplicates
        const optionSet = new Set(validOptions.map(opt => opt.trim().toLowerCase()))
        if (optionSet.size !== validOptions.length) {
          alert('Please ensure all options are different. Duplicate answers are not allowed.')
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
      question: newQuestion.question.trim(),
      points: newQuestion.points || 1,
      ...(newQuestion.type === 'mcq' && {
        options: newQuestion.options.filter(opt => opt.trim()),
        correctAnswer: newQuestion.correctAnswer
      }),
      media: { ...newQuestion.media }
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
        // Fill options array back to 4 slots for editing, padding with empty strings
        options = [...question.options, ...new Array(4 - question.options.length).fill('')].slice(0, 4)
        correctAnswer = question.correctAnswer
    }

    setNewQuestion({
      type: question.type || 'mcq',
      question: question.question,
      options: options,
      correctAnswer: correctAnswer,
      points: question.points || 1,
      media: question.media || { image: null, video: null, graph: null }
    })
  }

  const handleMediaUpload = (type, file) => {
    if (!file) return
    
    // In a real app, you'd upload to a server and get a URL
    // For now, we'll use a FileReader to create a preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setNewQuestion(prev => ({
        ...prev,
        media: {
          ...prev.media,
          [type]: {
            file: file.name,
            url: reader.result,
            type: file.type
          }
        }
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveMedia = (type) => {
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
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      q.type === 'mcq' ? 'bg-green-100 text-green-700' : 
                      q.type === 'interview' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {q.type.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">{q.points} point{q.points !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-gray-900 font-medium">{q.question}</p>
                  
                  {/* MCQ Options Display */}
                  {q.type === 'mcq' && q.options && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2 text-sm">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            optIndex === q.correctAnswer
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {optIndex === q.correctAnswer ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className={optIndex === q.correctAnswer ? 'font-semibold text-green-700' : 'text-gray-700'}>
                            {opt}
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
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {newQuestion.type === 'mcq' && 'Students select one correct option from a list.'}
            {newQuestion.type === 'viva' && 'Student records a spoken/video answer.'}
            {newQuestion.type === 'interview' && 'Interview-style prompt; student records their response.'}
          </p>
        </div>

        {/* Question Text */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Question <span className="text-red-500">*</span>
          </label>
          <textarea
            value={newQuestion.question}
            onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your question here..."
          />
        </div>

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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                    newQuestion.correctAnswer === index
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
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        hasDuplicate ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                    className={`px-3 py-1 text-sm rounded-lg transition-colors flex-shrink-0 ${
                      newQuestion.correctAnswer === index
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


        {/* Points */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Points
          </label>
          <input
            type="number"
            min="1"
            value={newQuestion.points}
            onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Media Upload */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Media Attachments <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Image */}
            <div className="border border-gray-300 rounded-lg p-3">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Image className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-600">Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMediaUpload('image', e.target.files[0])}
                  className="hidden"
                />
                {newQuestion.media.image && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-600">{newQuestion.media.image.file}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia('image')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </label>
            </div>

            {/* Video */}
            <div className="border border-gray-300 rounded-lg p-3">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Video className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-600">Video</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleMediaUpload('video', e.target.files[0])}
                  className="hidden"
                />
                {newQuestion.media.video && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-600">{newQuestion.media.video.file}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia('video')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </label>
            </div>

            {/* Graph/Chart */}
            <div className="border border-gray-300 rounded-lg p-3">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <FileText className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-600">Graph/Chart</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleMediaUpload('graph', e.target.files[0])}
                  className="hidden"
                />
                {newQuestion.media.graph && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-600">{newQuestion.media.graph.file}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia('graph')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

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
            onClick={editingIndex !== null ? () => handleUpdateQuestion(editingIndex) : handleAddQuestion}
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