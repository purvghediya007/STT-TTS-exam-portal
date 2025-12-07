import React, { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Clock, TrendingUp, Award, CheckCircle2, Calendar, FileText, Plus, Eye } from 'lucide-react'
import { useFacultyExams } from '../hooks/useFacultyExams'

/**
 * FacultyDashboardView - Main dashboard with statistics for faculty
 */
export default function FacultyDashboardView() {
  const navigate = useNavigate()
  const { exams, stats, loading, refreshExams, refreshStats } = useFacultyExams()
  
  // Refresh data when component mounts
  useEffect(() => {
    refreshExams()
    refreshStats()
  }, [refreshExams, refreshStats])

  // Classify exam status
  const classifyExam = (exam) => {
    if (!exam) return 'unknown'
    const now = new Date()
    if (exam.status === 'finished') return 'completed'
    if (!exam.startsAt || !exam.endsAt) {
      if (exam.status === 'live') return 'active'
      if (exam.status === 'upcoming') return 'upcoming'
      return 'unknown'
    }
    const starts = new Date(exam.startsAt)
    const ends = new Date(exam.endsAt)
    if (!isNaN(starts.getTime()) && now < starts) return 'upcoming'
    if (!isNaN(starts.getTime()) && !isNaN(ends.getTime()) && now >= starts && now < ends) return 'active'
    if (!isNaN(ends.getTime()) && now >= ends) return 'completed'
    return 'unknown'
  }

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = exams.length
    const upcoming = exams.filter(e => classifyExam(e) === 'upcoming')
    const active = exams.filter(e => classifyExam(e) === 'active')
    const completed = exams.filter(e => classifyExam(e) === 'completed')

    // Calculate average submissions per exam
    const totalSubmissions = completed.reduce((sum, exam) => {
      return sum + (exam.submissionCount || 0)
    }, 0)
    const avgSubmissions = completed.length > 0 ? Math.round(totalSubmissions / completed.length) : 0

    // Get recent exams
    const recent = exams
      .slice()
      .sort((a, b) => {
        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
      .slice(0, 5)

    return {
      total,
      upcoming: upcoming.length,
      active: active.length,
      completed: completed.length,
      totalStudents: stats?.totalStudents || 0,
      avgSubmissions,
      recent
    }
  }, [exams, stats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Faculty Dashboard</h1>
          <p className="text-gray-600">Overview of your exams, students, and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/faculty/exams')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View All Exams
          </button>
          <button
            onClick={() => navigate('/faculty/exams?create=true')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Exam
          </button>
        </div>
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Exams Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {metrics.total}
          </div>
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Total Exams
          </div>
        </div>

        {/* Active Exams Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {metrics.active}
          </div>
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Active Exams
          </div>
        </div>

        {/* Upcoming Exams Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {metrics.upcoming}
          </div>
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Upcoming Exams
          </div>
        </div>

        {/* Total Students Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {metrics.totalStudents}
          </div>
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Total Students
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Completed Exams Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Completed Exams</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{metrics.completed}</div>
        </div>

        {/* Average Submissions Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Avg Submissions</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{metrics.avgSubmissions}</div>
        </div>

        {/* Completion Rate Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Award className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Completion Rate</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics.total > 0 
              ? Math.round((metrics.completed / metrics.total) * 100) 
              : 0}%
          </div>
        </div>
      </div>

      {/* Recent Exams */}
      {metrics.recent.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Exams</h3>
            <div className="text-sm text-gray-500">{metrics.recent.length} items</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="pb-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Exam</th>
                  <th className="pb-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="pb-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="pb-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Submissions</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recent.map((ex) => {
                  const status = classifyExam(ex)
                  const statusColors = {
                    active: 'bg-green-100 text-green-800',
                    upcoming: 'bg-yellow-100 text-yellow-800',
                    completed: 'bg-gray-100 text-gray-800'
                  }
                  const createdLabel = ex?.createdAt ? new Date(ex.createdAt).toLocaleDateString() : '-'
                  return (
                    <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900">{ex.title}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{createdLabel}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                          {ex.submissionCount || 0}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => navigate('/faculty/exams')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View all exams →
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">No exams yet</p>
          <p className="text-gray-400">Create your first exam to get started</p>
        </div>
      )}
    </div>
  )
}

