import React, { useMemo } from 'react'
import { Calendar, CheckSquare, Award, TrendingUp, Clock } from 'lucide-react'
import { useExams } from '../hooks/useExams'

/**
 * DashboardView - Main dashboard with statistics and recent exams
 */
export default function DashboardView() {
  const { exams = [], loading, error } = useExams({ initialStatus: 'all' }) || {}
  
  // Debug logging
  React.useEffect(() => {
    if (!loading) {
      console.log('DashboardView - Exams loaded:', exams.length, 'exams')
      if (error) {
        console.error('DashboardView - Error:', error)
      }
    }
  }, [exams, loading, error])

  // Classify exam status
  const classifyExam = (exam) => {
    if (!exam) return 'unknown'
    const now = new Date()
    if (exam.status === 'finished') return 'submitted'
    if (!exam.startsAt || !exam.endsAt) {
      if (exam.status === 'live') return 'available'
      if (exam.status === 'upcoming') return 'upcoming'
      return 'unknown'
    }
    const starts = new Date(exam.startsAt)
    const ends = new Date(exam.endsAt)
    if (!isNaN(starts.getTime()) && now < starts) return 'upcoming'
    if (!isNaN(starts.getTime()) && !isNaN(ends.getTime()) && now >= starts && now < ends) return 'available'
    if (!isNaN(ends.getTime()) && now >= ends) return 'submitted'
    return 'unknown'
  }

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!exams || exams.length === 0) {
      return {
        upcoming: 0,
        available: 0,
        submitted: 0,
        avg: null,
        max: null,
        min: null,
        recent: []
      }
    }
    
    const upcoming = exams.filter(e => classifyExam(e) === 'upcoming')
    const available = exams.filter(e => classifyExam(e) === 'available')
    const submitted = exams.filter(e => classifyExam(e) === 'submitted')

    const scores = submitted
      .map((ex) => {
        const s = ex?.score ?? ex?.result?.score ?? ex?.totalScore ?? ex?.pointsAwarded ?? null
        return typeof s === 'number' ? s : null
      })
      .filter((s) => s != null)

    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const max = scores.length ? Math.max(...scores) : null
    const min = scores.length ? Math.min(...scores) : null

    const recent = submitted
      .slice()
      .sort((a, b) => {
        const ta = a?.endsAt ? new Date(a.endsAt).getTime() : 0
        const tb = b?.endsAt ? new Date(b.endsAt).getTime() : 0
        return tb - ta
      })
      .slice(0, 6)

    return {
      upcoming: upcoming.length,
      available: available.length,
      submitted: submitted.length,
      avg,
      max,
      min,
      recent
    }
  }, [exams])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  // Show error message if there's an error
  if (error && exams.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your exam performance and statistics</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your exam performance and statistics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upcoming Quiz Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Calendar className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {metrics.upcoming}
          </div>
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Upcoming Quiz
          </div>
        </div>

        {/* Available Quiz Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <CheckSquare className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {metrics.available}
          </div>
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Available Quiz
          </div>
        </div>

        {/* Submitted Quiz Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <CheckSquare className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {metrics.submitted}
          </div>
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Submitted Quiz
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {metrics.submitted > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Average Score</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.avg ?? '-'}</div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Award className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Top Score</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.max ?? '-'}</div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Lowest Score</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.min ?? '-'}</div>
          </div>
        </div>
      )}

      {/* Recent Completed Exams */}
      {metrics.recent.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Completed Exams</h3>
            <div className="text-sm text-gray-500">{metrics.recent.length} items</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="pb-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Exam</th>
                  <th className="pb-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed</th>
                  <th className="pb-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recent.map((ex) => {
                  const score = ex?.score ?? ex?.result?.score ?? ex?.totalScore ?? '-'
                  const completedLabel = ex?.endsAt ? new Date(ex.endsAt).toLocaleString() : '-'
                  return (
                    <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900">{ex.title}</td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{completedLabel}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-600 text-white text-sm font-semibold">
                          {score}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {metrics.recent.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">No completed exams yet</p>
          <p className="text-gray-500">Complete your first exam to see statistics and performance metrics here.</p>
        </div>
      )}

      {/* Empty State - No Exams */}
      {!loading && exams.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">No exams available</p>
          <p className="text-gray-500">There are no exams assigned to you at this time. Check back later or contact your instructor.</p>
        </div>
      )}
    </div>
  )
}

