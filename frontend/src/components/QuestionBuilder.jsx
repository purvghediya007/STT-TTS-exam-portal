import React, { useState } from 'react'
import { Plus, Trash2, Image, Video, FileText, X } from 'lucide-react'

/**
 * QuestionBuilder - Build Viva and Interview questions
 */
export default function QuestionBuilder({ questions, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [newQuestion, setNewQuestion] = useState({
    type: 'viva',
    question: '',
    points: 1,
    media: {
      image: null,
      video: null,
      graph: null
    }
  })

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      alert('Please enter a question')
      return
    }

    const question = {
      id: `Q${Date.now()}`,
      type: newQuestion.type,
      question: newQuestion.question.trim(),
      points: newQuestion.points || 1,
      media: { ...newQuestion.media }
    }

    const updatedQuestions = [...questions, question]
    onChange(updatedQuestions)
    
    setNewQuestion({
      type: 'viva',
      question: '',
      points: 1,
      media: { image: null, video: null, graph: null }
    })
    setEditingIndex(null)
  }

  const handleUpdateQuestion = (index) => {
    const question = questions[index]
    
    const updated = {
      ...question,
      type: newQuestion.type,
      question: newQuestion.question.trim(),
      points: newQuestion.points || 1,
      media: { ...newQuestion.media }
    }

    const updatedQuestions = [...questions]
    updatedQuestions[index] = updated
    onChange(updatedQuestions)
    
    setEditingIndex(null)
    setNewQuestion({
      type: 'viva',
      question: '',
      points: 1,
      media: { image: null, video: null, graph: null }
    })
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
    setNewQuestion({
      type: question.type || 'viva',
      question: question.question,
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
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${q.type === 'interview' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                      {q.type === 'interview' ? 'INTERVIEW' : 'VIVA'}
                    </span>
                    <span className="text-sm text-gray-600">{q.points} point{q.points !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-gray-900 font-medium">{q.question}</p>
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

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type</label>
          <div className="flex items-center gap-3">
            <label className={`px-3 py-1 rounded-lg border cursor-pointer ${newQuestion.type === 'viva' ? 'bg-pink-100 border-pink-300 text-pink-700' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
              <input
                type="radio"
                name="questionType"
                value="viva"
                checked={newQuestion.type === 'viva'}
                onChange={() => setNewQuestion({ ...newQuestion, type: 'viva' })}
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
                onChange={() => setNewQuestion({ ...newQuestion, type: 'interview' })}
                className="mr-2"
              />
              Interview
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {newQuestion.type === 'viva' ? 'Student records a spoken/video answer.' : 'Interview-style prompt; student records their response.'}
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
                setNewQuestion({
                  type: 'viva',
                  question: '',
                  points: 1,
                  media: { image: null, video: null, graph: null }
                })
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
