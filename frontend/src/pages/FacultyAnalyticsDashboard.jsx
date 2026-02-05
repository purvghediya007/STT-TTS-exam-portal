import React, { useMemo } from 'react'

/**
 * FacultyAnalyticsDashboard (static)
 * - Single wide dashboard (desktop-first)
 * - No compare section, no filters, no dropdowns
 * - Uses static/mock data shaped for easy API replacement
 * - Student table optimized for ~150 rows (virtualization not required; memoized rows + limited DOM)
 */

const STATUS = (score) => {
  if (score >= 85) return 'Excellent'
  if (score >= 60) return 'Average'
  return 'Needs Improvement'
}

const generateMockStudents = (count = 150) => {
  const names = ['Asha', 'Vikram', 'Neha', 'Rohit', 'Priya', 'Karan', 'Anjali', 'Sameer', 'Maya', 'Ishaan']
  const students = new Array(count).fill(null).map((_, i) => {
    const sem = (i % 8) + 1
    const avg = Math.round(50 + (i % 50) * 0.9)
    const audioScore = Math.max(0, Math.min(100, Math.round(avg - (i % 7) * 2 + (i % 5))))
    return {
      id: `S${1000 + i}`,
      name: `${names[i % names.length]} ${String.fromCharCode(65 + (i % 26))}`,
      roll: `20BCE${(1000 + i).toString().slice(-4)}`,
      semester: sem,
      averageScore: avg,
      audioScore,
      status: STATUS(Math.round((avg + audioScore) / 2))
    }
  })
  return students
}

const mock = {
  overview: {
    averageScore: 74.3,
    passPercentage: 88,
    topPerformers: 12,
    lowPerformers: 8,
    byDepartment: [
      { name: 'Computer Science', avg: 75.6 },
      { name: 'Electronics', avg: 72.1 },
      { name: 'Mechanical', avg: 69.9 }
    ],
    byBranch: [
      { name: 'AI & ML', avg: 78.2 },
      { name: 'Systems', avg: 73.0 }
    ],
    bySemester: [
      { sem: 1, avg: 68 }, { sem: 2, avg: 70 }, { sem: 3, avg: 72 }, { sem: 4, avg: 74 },
      { sem: 5, avg: 76 }, { sem: 6, avg: 78 }, { sem: 7, avg: 80 }, { sem: 8, avg: 82 }
    ]
  },
  semesters: new Array(8).fill(null).map((_, i) => ({
    sem: i + 1,
    avg: Math.round(60 + i * 3 + Math.random() * 4),
    high: Math.round(85 + Math.random() * 10),
    low: Math.round(35 + Math.random() * 10),
    total: 18 + Math.round(Math.random() * 3)
  })),
  students: generateMockStudents(150)
}

const MetricCard = ({ title, value, hint }) => (
  <div className="flex-1 bg-white rounded-lg p-5 shadow-sm border border-gray-100">
    <div className="text-xs text-gray-400">{title}</div>
    <div className="mt-2 text-2xl font-semibold text-slate-800">{value}</div>
    {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
  </div>
)

const SemesterCard = ({ s }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 w-full">
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
  </div>
)

const StudentRow = React.memo(function StudentRow({ student, style }) {
  return (
    <tr className="even:bg-white odd:bg-slate-50" style={style}>
      <td className="px-4 py-2 text-sm text-slate-700">{student.name}</td>
      <td className="px-4 py-2 text-sm text-slate-700">{student.roll}</td>
      <td className="px-4 py-2 text-sm text-slate-700">{student.semester}</td>
      <td className="px-4 py-2 text-sm text-slate-700">{student.averageScore}%</td>
      <td className="px-4 py-2 text-sm text-slate-700">{student.audioScore}%</td>
      <td className={`px-4 py-2 text-sm font-semibold ${student.status === 'Excellent' ? 'text-green-700' : student.status === 'Average' ? 'text-amber-700' : 'text-red-700'}`}>
        {student.status}
      </td>
    </tr>
  )
})

const FacultyAnalyticsDashboard = () => {
  const data = useMemo(() => mock, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Fixed header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div>
            <div className="text-sm text-gray-500">Faculty</div>
            <div className="text-xl font-semibold">Course Analytics — Spring 2026</div>
          </div>
          <div className="text-sm text-gray-500">Dept: Computer Science • Branch: AI & ML • Semester view</div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Overview */}
        <section className="w-full">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-3">Overview</h2>
              <div className="grid grid-cols-4 gap-4">
                <MetricCard title="Average score" value={`${data.overview.averageScore}%`} hint="Across selected cohort" />
                <MetricCard title="Pass percentage" value={`${data.overview.passPercentage}%`} hint="Students scoring ≥ passing marks" />
                <MetricCard title="Top performers" value={data.overview.topPerformers} hint="Students ≥ 90%" />
                <MetricCard title="Low performers" value={data.overview.lowPerformers} hint="Students < 50%" />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {data.overview.byDepartment.map(d => (
                  <div key={d.name} className="bg-white rounded-md p-3 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500">Department</div>
                    <div className="mt-1 font-medium">{d.name}</div>
                    <div className="text-sm text-gray-600 mt-1">Avg {d.avg}%</div>
                  </div>
                ))}

                {data.overview.byBranch.map(b => (
                  <div key={b.name} className="bg-white rounded-md p-3 border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500">Branch</div>
                    <div className="mt-1 font-medium">{b.name}</div>
                    <div className="text-sm text-gray-600 mt-1">Avg {b.avg}%</div>
                  </div>
                ))}

                <div className="bg-white rounded-md p-3 border border-gray-100 shadow-sm col-span-3">
                  <div className="text-xs text-gray-500">Semester aggregated</div>
                  <div className="mt-2 flex items-center gap-3">
                    {data.overview.bySemester.map(s => (
                      <div key={s.sem} className="text-sm text-gray-600">Sem {s.sem}: <span className="font-semibold">{s.avg}%</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Small visual / placeholder (desktop-first) */}
            <div className="w-72 hidden lg:block">
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm h-full flex flex-col">
                <div className="text-xs text-gray-500">Performance distribution</div>
                <div className="flex-1 flex items-center justify-center">
                  <svg width="160" height="120" className="opacity-80" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <rect x="8" y="50" width="18" height="62" rx="3" fill="#E6F4EA" stroke="#D1F0D8" />
                    <rect x="36" y="30" width="18" height="82" rx="3" fill="#FEF6E8" stroke="#F7EECF" />
                    <rect x="64" y="12" width="18" height="100" rx="3" fill="#EEF2FF" stroke="#E3E9FF" />
                    <rect x="92" y="28" width="18" height="84" rx="3" fill="#FFF1F3" stroke="#FFE6EA" />
                    <rect x="120" y="44" width="18" height="68" rx="3" fill="#F0FDF4" stroke="#E6FBEB" />
                  </svg>
                </div>
                <div className="text-xs text-gray-400 mt-3">Distribution (mock)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Semester-wise analysis */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Semester-wise analysis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.semesters.map(s => <SemesterCard key={s.sem} s={s} />)}
          </div>
        </section>

        {/* Student-wise performance - only this section scrolls vertically */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Student-wise performance</h3>

          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Student Name</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Roll Number</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Semester</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Average Score</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Audio Evaluation Score</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500">Status</th>
                  </tr>
                </thead>
              </table>
            </div>

            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full table-fixed border-collapse">
                <tbody>
                  {data.students.map((s, idx) => (
                    <StudentRow key={s.id} student={s} style={{}} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 text-xs text-gray-500 border-t border-gray-100">Showing <strong>{data.students.length}</strong> students — designed for ~150 rows (vertical scroll only).</div>
          </div>
        </section>

        <div className="h-8" />
      </main>

    </div>
  )
}

export default FacultyAnalyticsDashboard

