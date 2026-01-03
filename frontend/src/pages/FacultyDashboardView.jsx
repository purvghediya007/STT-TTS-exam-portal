import React, { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Clock, TrendingUp, Award, CheckCircle2, Calendar, FileText, Plus, Eye } from 'lucide-react'
import { useFacultyExams } from '../hooks/useFacultyExams'

/**
 * FacultyDashboardView - Main dashboard with statistics for faculty
 * Updated for high responsiveness and improved visual hierarchy
 */
export default function FacultyDashboardView() {
  const navigate = useNavigate()
  const { exams, stats, loading, refreshExams, refreshStats } = useFacultyExams()
  
  useEffect(() => {
    refreshExams()
    refreshStats()
  }, [refreshExams, refreshStats])

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

  const metrics = useMemo(() => {
    const total = exams.length
    const upcoming = exams.filter(e => classifyExam(e) === 'upcoming')
    const active = exams.filter(e => classifyExam(e) === 'active')
    const completed = exams.filter(e => classifyExam(e) === 'completed')

    const totalSubmissions = completed.reduce((sum, exam) => {
      return sum + (exam.submissionCount || 0)
    }, 0)
    const avgSubmissions = completed.length > 0 ? Math.round(totalSubmissions / completed.length) : 0

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500 font-medium">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Faculty Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600">Overview of your exams and performance metrics</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => navigate('/faculty/exams')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
          >
            <Eye className="w-4 h-4" />
            <span>Exams</span>
          </button>
          <button
            onClick={() => navigate('/faculty/exams?create=true')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Exams', val: metrics.total, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Now', val: metrics.active, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Upcoming', val: metrics.upcoming, icon: Calendar, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Total Students', val: metrics.totalStudents, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-5 md:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 ${item.bg} rounded-lg`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{item.val}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: 'Completed', val: metrics.completed, icon: CheckCircle2 },
          { label: 'Avg Submissions', val: metrics.avgSubmissions, icon: TrendingUp },
          { label: 'Completion Rate', val: `${metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%`, icon: Award },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-gray-50 rounded-lg">
              <item.icon className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</div>
              <div className="text-2xl font-bold text-gray-900">{item.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Exams Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <h3 className="text-lg font-bold text-gray-900">Recent Exams</h3>
          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {metrics.recent.length} recent entries
          </span>
        </div>

        {metrics.recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Exam Title</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="hidden sm:table-cell py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Created Date</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Submissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.recent.map((ex) => {
                  const status = classifyExam(ex)
                  const statusStyles = {
                    active: 'bg-green-100 text-green-700 border-green-200',
                    upcoming: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                    completed: 'bg-blue-50 text-blue-700 border-blue-100',
                    unknown: 'bg-gray-100 text-gray-600 border-gray-200'
                  }
                  return (
                    <tr key={ex.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-4 px-6 font-semibold text-gray-900 max-w-[200px] truncate">{ex.title}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase tracking-tight ${statusStyles[status] || statusStyles.unknown}`}>
                          {status}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell py-4 px-6 text-gray-500 text-sm">
                        {ex?.createdAt ? new Date(ex.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-bold text-gray-900">{ex.submissionCount || 0}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No exams created yet.</p>
            <button 
               onClick={() => navigate('/faculty/exams?create=true')}
               className="mt-4 text-blue-600 text-sm font-semibold hover:underline"
            >
              Click here to get started
            </button>
          </div>
        )}
        
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 text-center sm:text-left">
          <button
            onClick={() => navigate('/faculty/exams')}
            className="text-blue-600 hover:text-blue-700 text-sm font-bold transition-colors"
          >
            See all exams in full list →
          </button>
        </div>
      </div>
    </div>
  )
}