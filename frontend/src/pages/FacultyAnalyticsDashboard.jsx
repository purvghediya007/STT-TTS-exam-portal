import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * FacultyAnalyticsDashboard
 * - Single wide dashboard (desktop-first)
 * - Shows 8 semester cards with performance overview
 * - Click semester to view student list (vertical scrollable)
 * - Filters data by faculty's department
 * - Fetches real data from API
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const getStatusColor = (status) => {
  if (status === 'Excellent') return 'text-green-700'
  if (status === 'Average') return 'text-amber-700'
  return 'text-red-700'
}

const MetricCard = ({ title, value, hint }) => (
  <div className="flex-1 bg-white rounded-lg p-5 shadow-sm border border-gray-100">
    <div className="text-xs text-gray-400">{title}</div>
    <div className="mt-2 text-2xl font-semibold text-slate-800">{value}</div>
    {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
  </div>
)

const LabelPill = ({ text }) => (
  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
    {text}
  </span>
)

const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined) return "N/A";
  return `${minutes} min`;
}

const getDifficultyBadge = (value) => {
  if (value >= 70) return "bg-red-100 text-red-700";
  if (value >= 40) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

const SemesterCard = ({ s, isSelected, onSelect, isLoading }) => (
  <button
    onClick={() => onSelect(s.sem)}
    disabled={isLoading}
    className={`w-full text-left bg-white rounded-lg p-4 shadow-sm border-2 transition-all hover:shadow-md disabled:opacity-50 ${
      isSelected
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-100 hover:border-gray-300'
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">Semester {s.sem}</div>
        <div className="text-xs text-gray-500">Students: {s.total}</div>
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold">{s.avg}%</div>
        <div className="text-xs text-gray-500">High {s.high}% • Low {s.low}%</div>
      </div>
    </div>
  </button>
)

const StudentRow = React.memo(function StudentRow({ student }) {
  return (
    <tr className="even:bg-white odd:bg-slate-50">
      <td className="px-4 py-2 text-sm text-slate-700">{student.name}</td>
      <td className="px-4 py-2 text-sm text-slate-700">{student.enrollmentNumber}</td>
      <td className="px-4 py-2 text-sm text-slate-700">{student.semester}</td>
      <td className="px-4 py-2 text-sm text-slate-700">{student.averageScore}%</td>
      <td className={`px-4 py-2 text-sm font-semibold ${getStatusColor(student.status)}`}>
        {student.status}
      </td>
    </tr>
  )
})

const SemesterPerformanceChart = ({ data = [] }) => {
  const maxValue = Math.max(100, ...data.map((item) => item.avg || 0))

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Semester performance</div>
          <div className="mt-1 text-lg font-semibold text-slate-800">Overall % by semester</div>
        </div>
        <div className="text-sm text-gray-500">Avg across semesters</div>
      </div>

      {data.length === 0 ? (
        <div className="text-gray-500 text-sm">No semester performance data available.</div>
      ) : (
        <div className="grid grid-cols-4 gap-3 items-end h-52 px-2">
          {data.map((item) => {
            const value = Math.max(0, Math.min(100, item.avg || 0))
            return (
              <div key={item.sem} className="flex flex-col items-center gap-2">
                <div className="text-sm font-semibold text-slate-800">{Math.round(value)}%</div>
                <div className="relative w-full h-full max-h-56 min-h-[16px] w-12 rounded-t-lg overflow-hidden bg-slate-100">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-gradient-to-t from-sky-500 to-cyan-500 transition-all duration-500"
                    style={{ height: `${(value / maxValue) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">Sem {item.sem}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const FacultyAnalyticsDashboard = () => {
  const [semesters, setSemesters] = useState([])
  const [examMetrics, setExamMetrics] = useState([])
  const [selectedSemester, setSelectedSemester] = useState(null)
  const [semesterStudents, setSemesterStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return semesterStudents
    const query = searchTerm.trim().toLowerCase()
    return semesterStudents.filter((student) =>
      (student.enrollmentNumber || '').toLowerCase().includes(query)
    )
  }, [semesterStudents, searchTerm])

  // Fetch semester overview on mount
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setOverviewLoading(true)
        setError(null)
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setError('Not authenticated')
          return
        }

        const res = await fetch(`${API_BASE}/api/faculty/analytics/overview`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) throw new Error('Failed to fetch overview')
        const data = await res.json()
        const overview = data.data || {}
        setSemesters(overview.semesterData || [])
        const exams = overview.examMetrics || []
        setExamMetrics(exams)
      } catch (err) {
        console.error('Overview fetch error:', err)
        setError(err.message)
      } finally {
        setOverviewLoading(false)
      }
    }

    fetchOverview()
  }, [])

  // Fetch students for selected semester
  useEffect(() => {
    if (!selectedSemester) {
      setSemesterStudents([])
      return
    }

    const fetchStudents = async () => {
      try {
        setLoading(true)
        setError(null)
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setError('Not authenticated')
          return
        }

        const res = await fetch(
          `${API_BASE}/api/faculty/analytics/semester/${selectedSemester}?page=1&limit=100`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!res.ok) throw new Error('Failed to fetch students')
        const data = await res.json()
        setSemesterStudents(data.data.students || [])
      } catch (err) {
        console.error('Students fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [selectedSemester])

  // Calculate average across all semesters
  const overallAverage = useMemo(() => {
    if (semesters.length === 0) return 0
    const sum = semesters.reduce((acc, s) => acc + (s.avg || 0), 0)
    return Math.round(sum / semesters.length)
  }, [semesters])


  // Calculate total students
  const totalStudents = useMemo(() => {
    return semesters.reduce((acc, s) => acc + (s.total || 0), 0)
  }, [semesters])

  return (
    <div className="min-h-screen  bg-slate-50 text-slate-800">
      {/* Fixed header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div>
            <div className="text-sm text-gray-500">Faculty</div>
            <div className="text-xl font-semibold">Performance Analytics</div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <div className="text-sm font-medium">Error: {error}</div>
          </div>
        )}

        {/* Overview */}
        <section className="w-full">
          <h2 className="text-lg font-semibold mb-3">Overview</h2>
          {overviewLoading ? (
            <div className="text-center py-8 text-gray-500">Loading overview...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard title="Total students" value={totalStudents} hint="Across all semesters" />
                <MetricCard title="Overall average" value={`${overallAverage}%`} hint="All semesters combined" />
              </div>
              <SemesterPerformanceChart data={semesters} />
            </div>
          )}
        </section>

        {/* Exam-level insights */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Exam-level insights</h3>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Exam comparison</div>
                <div className="text-lg font-semibold text-slate-800">Average score and pass rate</div>
              </div>
              <LabelPill text="Full width" />
            </div>
            {examMetrics.length === 0 ? (
              <div className="text-gray-500 text-sm">No exam performance data available.</div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                {examMetrics.map((exam) => (
                  <button
                    key={exam.examId}
                    type="button"
                    onClick={() => navigate(`/faculty/analytics/${exam.examId}`)}
                    className="w-full text-left p-4 rounded-lg border border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">{exam.examName}</div>
                        <div className="text-sm text-gray-500">{exam.examCode}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span>Avg {exam.averageScore}%</span>
                        <span>Pass {exam.passRate}%</span>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Attempts {exam.attempts}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Semester-wise analysis */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Semester-wise analysis</h3>
          {overviewLoading ? (
            <div className="text-center py-8 text-gray-500">Loading semesters...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {semesters.map((s) => (
                <SemesterCard
                  key={s.sem}
                  s={s}
                  isSelected={selectedSemester === s.sem}
                  onSelect={setSelectedSemester}
                  isLoading={loading}
                />
              ))}
            </div>
          )}
        </section>

        {/* Student-wise performance - only this section scrolls vertically */}
        <section>
          <h3 className="text-lg font-semibold mb-3">
            Student-wise performance
            {selectedSemester && ` — Semester ${selectedSemester}`}
          </h3>

          {selectedSemester === null ? (
            <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8 text-center text-gray-500">
              Click on a semester card to view student performance
            </div>
          ) : loading ? (
            <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8 text-center text-gray-500">
              Loading students...
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
              <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">Search by Enrollment No.</div>
                  <p className="text-xs text-gray-500">Filter the current semester's student list</p>
                </div>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter enrollment number"
                  className="w-full max-w-sm rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs text-gray-500">Student Name</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500">Enrollment No.</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500">Semester</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500">Average Score</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500">Status</th>
                    </tr>
                  </thead>
                </table>
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? 'No matching students found for that enrollment number'
                      : 'No students found for this semester'}
                  </div>
                ) : (
                  <table className="w-full table-fixed border-collapse">
                    <tbody>
                      {filteredStudents.map((student) => (
                        <StudentRow key={student.id} student={student} />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {semesterStudents.length > 0 && (
                <div className="p-4 text-xs text-gray-500 border-t border-gray-100">
                  Showing <strong>{filteredStudents.length}</strong> of <strong>{semesterStudents.length}</strong> students matching search
                </div>
              )}
            </div>
          )}
        </section>

        <div className="h-8" />
      </main>
    </div>
  )
}

export default FacultyAnalyticsDashboard

