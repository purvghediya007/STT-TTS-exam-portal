import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { fetchExamScoreboard } from '../services/api'
import logger from '../utils/logger'

export default function ExamScoreboardView() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [scoreboard, setScoreboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const examTitleFromState = location.state?.examTitle

  useEffect(() => {
    async function loadScoreboard() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchExamScoreboard(examId)
        setScoreboard(data)
      } catch (err) {
        logger.error(err)
        setError(err?.message || 'Failed to load scoreboard')
      } finally {
        setIsLoading(false)
      }
    }

    if (examId) {
      loadScoreboard()
    }
  }, [examId])

  const currentRank = scoreboard?.currentUserRank
  const currentScore = scoreboard?.currentUserScore
  const currentPercentage = scoreboard?.currentUserPercentage
  const attempts = scoreboard?.entries || []

  return (
    <div className="min-h-screen bg-blue-50/20 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 text-sm font-semibold text-blue-700 uppercase tracking-wider">
              <Trophy className="w-5 h-5" />
              Exam Scoreboard
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {examTitleFromState || scoreboard?.exam?.title || 'Exam Scoreboard'}
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Review all students who attempted this exam and see where you rank among your peers.
            </p>
          </div>

          <button
            onClick={() => navigate('/student/history')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your Rank</p>
            <div className="mt-3 text-4xl font-bold text-slate-900">
              {currentRank != null ? currentRank : 'N/A'}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {currentRank != null
                ? `Among ${attempts.length} attempt${attempts.length === 1 ? '' : 's'}`
                : 'Submit the exam to earn a rank'}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your Score</p>
            <div className="mt-3 text-4xl font-bold text-slate-900">
              {currentScore != null ? currentScore : '--'}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {currentScore != null ? `of ${scoreboard?.exam?.pointsTotal ?? '--'}` : 'Score will appear after evaluation'}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your Percentage</p>
            <div className="mt-3 text-4xl font-bold text-slate-900">
              {currentPercentage != null ? `${currentPercentage}%` : '--'}
            </div>
            {/* <p className="mt-2 text-sm text-slate-500">Score percentage from this exam.</p> */}
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Participants</p>
            <div className="mt-3 text-4xl font-bold text-slate-900">{attempts.length}</div>
            {/* <p className="mt-2 text-sm text-slate-500">Students with completed submissions.</p> */}
          </div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-blue-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Enrollment</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Percentage</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading scoreboard...
                  </td>
                </tr>
              )}

              {!isLoading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && attempts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No completed exam attempts found yet.
                  </td>
                </tr>
              )}

              {!isLoading && !error && attempts.map((entry) => {
                const isCurrentUser = user?.sub?.toString() === entry.studentId?.toString()
                return (
                  <tr
                    key={`${entry.studentId}-${entry.rank}`}
                    className={`${isCurrentUser ? 'bg-cyan-50' : ''}`}
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900">{entry.rank}</td>
                    <td className="px-4 py-4 text-slate-700">{entry.studentName}</td>
                    <td className="px-4 py-4 text-slate-500">{entry.enrollmentNumber || '-'}</td>
                    <td className="px-4 py-4 text-slate-900">{entry.score}/{entry.maxScore}</td>
                    <td className="px-4 py-4 text-slate-800">{entry.percentage}%</td>
                    <td className="px-4 py-4 text-slate-500 capitalize">{entry.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
