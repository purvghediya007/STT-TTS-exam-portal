import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, Search, Filter, Calendar, Clock, Users, FileText, FileEdit } from 'lucide-react'
import { useFacultyExams } from '../hooks/useFacultyExams'
import ExamForm from '../components/ExamForm'
import ExamCreationWizard from '../components/ExamCreationWizard'
import { formatExamTimeRange, formatDuration } from '../utils/format'
import StatusPill from '../components/StatusPill'
import { fetchDraftExams, deleteDraftExam } from '../services/api'

/**
 * FacultyExamsList - Page to view and manage all exams
 */
export default function FacultyExamsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { exams, loading, error, refreshExams, refreshStats, deleteExam } = useFacultyExams()
  const [showForm, setShowForm] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  const [editingDraft, setEditingDraft] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const [drafts, setDrafts] = useState([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [activeTab, setActiveTab] = useState('published') // 'published' or 'drafts'

  // Check if create query param is set
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowWizard(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Load drafts
  useEffect(() => {
    loadDrafts()
  }, [])

  const loadDrafts = async () => {
    setLoadingDrafts(true)
    try {
      const draftList = await fetchDraftExams()
      setDrafts(draftList)
    } catch (error) {
      console.error('Error loading drafts:', error)
    } finally {
      setLoadingDrafts(false)
    }
  }

  const handleDeleteDraft = async (draftId) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return
    }

    try {
      await deleteDraftExam(draftId)
      await loadDrafts()
    } catch {
      alert('Failed to delete draft. Please try again.')
    }
  }

  const handleCreate = () => {
    setEditingExam(null)
    setEditingDraft(null)
    setShowWizard(true)
  }

  const handleEditDraft = (draft) => {
    setEditingDraft(draft)
    setEditingExam(null)
    setShowWizard(true)
  }

  const handleEdit = (exam) => {
    // Allow editing any exam at any time (faculty super power)
    setEditingExam(exam)
    setEditingDraft(null)
    setShowWizard(true)
  }

  const handleViewSubmissions = (exam) => {
    // Navigate to exam submissions view
    navigate(`/faculty/exams/${exam.id}/submissions`)
  }

  const handleDelete = async (examId) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return
    }

    setDeletingId(examId)
    try {
      await deleteExam(examId)
    } catch {
      alert('Failed to delete exam. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleFormSuccess = () => {
    refreshExams()
    refreshStats()
    setShowForm(false)
    setEditingExam(null)
  }

  const handleWizardSuccess = () => {
    refreshExams()
    refreshStats()
    loadDrafts()
    setShowWizard(false)
  }

  // Classify exam status
  const classifyExam = (exam) => {
    if (!exam) return 'unknown'
    const now = new Date()
    if (exam.status === 'finished') return 'finished'
    if (!exam.startsAt || !exam.endsAt) {
      if (exam.status === 'live') return 'live'
      if (exam.status === 'upcoming') return 'upcoming'
      return 'unknown'
    }
    const starts = new Date(exam.startsAt)
    const ends = new Date(exam.endsAt)
    if (!isNaN(starts.getTime()) && now < starts) return 'upcoming'
    if (!isNaN(starts.getTime()) && !isNaN(ends.getTime()) && now >= starts && now < ends) return 'live'
    if (!isNaN(ends.getTime()) && now >= ends) return 'finished'
    return exam.status || 'unknown'
  }

  // Filter published exams (exclude drafts)
  const publishedExams = exams.filter(exam => exam.status !== 'draft')

  // Filter and search exams
  const filteredExams = publishedExams.filter(exam => {
    const status = classifyExam(exam)

    // Status filter
    if (filterStatus !== 'all' && status !== filterStatus) {
      return false
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        exam.title.toLowerCase().includes(query) ||
        exam.id.toLowerCase().includes(query) ||
        exam.shortDescription.toLowerCase().includes(query)
      )
    }

    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading exams...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Exams</h1>
          <p className="text-gray-600">Manage and monitor all your exams</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Exam
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('published')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'published'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            Published Exams ({publishedExams.length})
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'drafts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            Drafts ({drafts.length})
          </button>
        </div>
      </div>

      {/* Drafts Tab */}
      {activeTab === 'drafts' && (
        <div className="space-y-4">
          {loadingDrafts ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading drafts...</div>
            </div>
          ) : drafts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <FileEdit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">No drafts yet</p>
              <p className="text-gray-400">Create a new exam to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.slice().reverse().map((draft) => (
                <div
                  key={draft.id}
                  className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{draft.title}</h3>
                      <p className="text-xs text-gray-500">ID: {draft.id}</p>
                      <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                        DRAFT
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{draft.shortDescription}</p>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <FileText className="w-4 h-4" />
                    <span>{draft.questions?.length || 0} question{(draft.questions?.length || 0) !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEditDraft(draft)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Continue Editing
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Published Exams Tab */}
      {activeTab === 'published' && (
        <>
          {/* Search and Filter */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exams by title, ID, or description..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Exams</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="finished">Finished</option>
                </select>
              </div>
            </div>
          </div>

          {/* Exams Grid */}
          {filteredExams.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">
                {searchQuery || filterStatus !== 'all' ? 'No exams found' : 'No exams yet'}
              </p>
              <p className="text-gray-400">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first exam to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.slice().reverse().map((exam) => {
                const status = classifyExam(exam)
                return (
                  <div
                    key={exam.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{exam.title}</h3>
                        <p className="text-xs text-gray-500">ID: {exam.id}</p>
                      </div>
                      <StatusPill status={status} />
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{exam.shortDescription}</p>

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatExamTimeRange(exam.startsAt, exam.endsAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(exam.durationMin)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{exam.submissionCount || 0} submissions</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      {(status === 'finished' || status === 'live') && (
                        <button
                          onClick={() => handleViewSubmissions(exam)}
                          className="px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Submissions
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(exam)}
                        className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        disabled={deletingId === exam.id}
                        className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Exam Form Modal */}
          {showForm && (
            <ExamForm
              exam={editingExam}
              onClose={() => {
                setShowForm(false)
                setEditingExam(null)
              }}
              onSuccess={handleFormSuccess}
            />
          )}
        </>
      )}

      {/* Exam Creation Wizard */}
      {showWizard && (
        <ExamCreationWizard
          onClose={() => {
            setShowWizard(false)
            setEditingExam(null)
            setEditingDraft(null)
          }}
          onSuccess={handleWizardSuccess}
          draft={editingDraft}
          exam={editingExam}
        />
      )}
    </div>
  )
}
