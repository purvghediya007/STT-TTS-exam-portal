import React, { useMemo } from 'react'
import { Calendar, CheckSquare, Award, TrendingUp, Clock } from 'lucide-react'
import { useExams } from '../hooks/useExams'

/**
 * DashboardView - Flexible structure for all devices
 */
export default function DashboardView() {
  const { exams = [], loading, error } = useExams({ initialStatus: 'all' }) || {}
  
  // Logic preserved exactly as requested
  React.useEffect(() => {
    if (!loading) {
      console.log('DashboardView - Exams loaded:', exams.length, 'exams')
      if (error) {
        console.error('DashboardView - Error:', error)
      }
    }
  }, [exams, loading, error])

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

  const metrics = useMemo(() => {
    if (!exams || exams.length === 0) {
      return { upcoming: 0, available: 0, submitted: 0, avg: null, max: null, min: null, recent: [] }
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

    return { upcoming: upcoming.length, available: available.length, submitted: submitted.length, avg, max, min, recent }
  }, [exams])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 w-full">
        <div className="text-gray-500 font-medium">Loading dashboard...</div>
      </div>
    )
  }

  if (error && exams.length === 0) {
    return (
      <div className="space-y-6 md:space-y-8 p-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600">Overview of your exam performance and statistics</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6">
          <p className="text-yellow-800 text-sm md:text-base">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600">Overview of your exam performance and statistics</p>
      </div>

      {/* Stat Cards - Grid: 1 col on mobile, 3 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Upcoming Quiz Card */}
        <div className="bg-white rounded-xl p-5 md:p-6 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start hover:-translate-y-0.5">
          <div className="p-2.5 bg-blue-50 rounded-lg mb-4">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          </div>
          <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{metrics.upcoming}</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Upcoming Quiz</div>
        </div>

        {/* Available Quiz Card */}
        <div className="bg-white rounded-xl p-5 md:p-6 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start hover:-translate-y-0.5">
          <div className="p-2.5 bg-blue-50 rounded-lg mb-4">
            <CheckSquare className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          </div>
          <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{metrics.available}</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Available Quiz</div>
        </div>

        {/* Submitted Quiz Card - spans 2 cols on tablet for better balance */}
        <div className="bg-white rounded-xl p-5 md:p-6 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start sm:col-span-2 lg:col-span-1 hover:-translate-y-0.5">
          <div className="p-2.5 bg-blue-50 rounded-lg mb-4">
            <CheckSquare className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          </div>
          <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{metrics.submitted}</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Submitted Quiz</div>
        </div>
      </div>

      {/* Performance Metrics - Row: Responsive columns */}
      {metrics.submitted > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-gray-100 rounded-lg shrink-0">
              <TrendingUp className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-tight">Average Score</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{metrics.avg ?? '-'}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-gray-100 rounded-lg shrink-0">
              <Award className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-tight">Top Score</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{metrics.max ?? '-'}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-gray-100 rounded-lg shrink-0">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-tight">Lowest Score</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{metrics.min ?? '-'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Completed Exams - Container with horizontal scroll for small devices */}
      {metrics.recent.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Recent Completed Exams</h3>
            <div className="text-[10px] md:text-sm text-gray-500">{metrics.recent.length} items</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="py-3 px-4 md:px-6 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Exam</th>
                  <th className="py-3 px-4 md:px-6 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Completed</th>
                  <th className="py-3 px-4 md:px-6 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {metrics.recent.map((ex) => {
                  const score = ex?.score ?? ex?.result?.score ?? ex?.totalScore ?? '-'
                  const completedLabel = ex?.endsAt ? new Date(ex.endsAt).toLocaleDateString() : '-'
                  return (
                    <tr key={ex.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 md:px-6 font-medium text-gray-900 text-sm md:text-base">{ex.title}</td>
                      <td className="py-4 px-4 md:px-6 text-gray-600 text-xs md:text-sm hidden sm:table-cell">{completedLabel}</td>
                      <td className="py-4 px-4 md:px-6 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 md:px-3 md:py-1 rounded-full bg-blue-600 text-white text-[10px] md:text-sm font-bold">
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

      {/* Empty States - Centered and responsive */}
      {metrics.recent.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 md:p-16 text-center">
          <Award className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-base md:text-lg font-medium mb-1">No completed exams yet</p>
          <p className="text-gray-500 text-xs md:text-sm">Complete your first exam to see statistics here.</p>
        </div>
      )}

      {!loading && exams.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 md:p-16 text-center">
          <Calendar className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-base md:text-lg font-medium mb-1">No exams available</p>
          <p className="text-gray-500 text-xs md:text-sm">There are no exams assigned to you at this time.</p>
        </div>
      )}
    </div>
  )
}