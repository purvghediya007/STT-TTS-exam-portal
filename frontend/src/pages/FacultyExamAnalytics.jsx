import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Activity, Users, ClipboardList } from 'lucide-react'
import logger from '../utils/logger'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')

const getDifficultyBadge = (value) => {
  if (value >= 70) return 'bg-red-100 text-red-700'
  if (value >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

const FacultyExamAnalytics = () => {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [summary, setSummary] = useState({ averageScore: 0, passRate: 0, attempts: 0 })
  const [questionDifficulty, setQuestionDifficulty] = useState([])
  const [studentAttempts, setStudentAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchExamAnalysis = async () => {
      try {
        setError(null)
        setLoading(true)
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setError('Not authenticated')
          return
        }

        const res = await fetch(`${API_BASE}/api/faculty/analytics/exam/${examId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.message || 'Failed to fetch exam analysis')
        }

        const data = await res.json()
        setExam(data.data.exam || null)
        setSummary(data.data.summary || { averageScore: 0, passRate: 0, attempts: 0 })
        setQuestionDifficulty(data.data.questionDifficulty || [])
        setStudentAttempts(data.data.studentAttempts || [])
      } catch (err) {
        logger.error('Exam analysis fetch error:', err)
        setError(err.message || 'Unable to fetch exam analysis')
      } finally {
        setLoading(false)
      }
    }

    if (examId) {
      fetchExamAnalysis()
    }
  }, [examId])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => navigate('/faculty/analytics')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to analytics
          </button>
          <div>
            <div className="text-sm text-gray-500">Faculty</div>
            <div className="text-xl font-semibold">Exam Analysis</div>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <div className="text-sm font-medium">Error: {error}</div>
          </div>
        )}

        <section className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading exam analysis...</div>
          ) : exam ? (
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Exam</div>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">{exam.examName}</h1>
                <div className="mt-2 text-sm text-gray-600">Code: {exam.examCode || 'N/A'}</div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Avg score</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.averageScore}%</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Pass rate</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.passRate}%</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Attempts</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.attempts}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Exam details
                </div>
                <div className="mt-4 text-sm text-gray-600 space-y-2">
                  <div>Points total: {exam.pointsTotal}</div>
                  <div>Started at: {exam.startTime ? new Date(exam.startTime).toLocaleString() : 'N/A'}</div>
                  <div>Ended at: {exam.endTime ? new Date(exam.endTime).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Exam not found or unauthorized.</div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Question-wise analysis</div>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Most challenging questions</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <ClipboardList className="w-4 h-4" />
              Sorted by difficulty
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            {loading ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">Loading question analysis...</div>
            ) : questionDifficulty.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">No question-level data available for this exam.</div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                {questionDifficulty.map((question) => (
                  <div key={question.questionId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{question.text || 'Untitled question'}</div>
                        <div className="mt-1 text-xs text-gray-500">Type: {question.type || 'Unknown'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                        <span>Avg {question.avgScore}%</span>
                        <span>Pass {question.passRate}%</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getDifficultyBadge(question.difficultyIndex)}`}>
                          Difficulty {question.difficultyIndex}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Student-wise analysis</div>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Student marks for this exam</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Users className="w-4 h-4" />
              Individual attempts
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            {loading ? (
              <div className="py-12 text-center text-gray-500">Loading student attempts...</div>
            ) : studentAttempts.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No student attempts recorded for this exam.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Enrollment</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Percentage</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {studentAttempts.map((attempt) => (
                      <tr key={`${attempt.studentId}-${attempt.score}-${attempt.maxScore}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">{attempt.studentName}</td>
                        <td className="px-4 py-3 text-gray-600">{attempt.studentEnrollment}</td>
                        <td className="px-4 py-3 text-gray-700">{attempt.score}/{attempt.maxScore}</td>
                        <td className="px-4 py-3 text-gray-700">{attempt.percentage}%</td>
                        <td className="px-4 py-3 text-gray-700 capitalize">{attempt.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default FacultyExamAnalytics
