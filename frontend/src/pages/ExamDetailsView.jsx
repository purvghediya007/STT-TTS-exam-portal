import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Award, Users, AlertCircle, Zap } from 'lucide-react'
import { getExamSummary } from '../services/api'
import { formatExamTimeRange, formatDuration, formatTimePerQuestion } from '../utils/format'

/**
 * ExamDetailsView - Shows detailed information about an exam before taking it
 */
export default function ExamDetailsView() {
    const { examId } = useParams()
    const navigate = useNavigate()
    const [exam, setExam] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const loadExam = async () => {
            try {
                setLoading(true)
                setError(null)
                const examData = await getExamSummary(examId)
                setExam(examData)
            } catch (err) {
                console.error('Error loading exam:', err)
                setError(err.message || 'Failed to load exam details')
            } finally {
                setLoading(false)
            }
        }

        if (examId) {
            loadExam()
        }
    }, [examId])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-12 bg-slate-200 rounded-lg mb-6 w-1/3"></div>
                        <div className="bg-white rounded-xl p-6 space-y-4">
                            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold text-red-900 mb-1">Error Loading Exam</h3>
                                <p className="text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!exam) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                    <div className="text-center text-slate-600">Exam not found</div>
                </div>
            </div>
        )
    }

    const now = new Date()
    const startsAt = new Date(exam.startsAt)
    const endsAt = new Date(exam.endsAt)
    const isUpcoming = now < startsAt
    const isLive = now >= startsAt && now < endsAt
    const isFinished = now >= endsAt

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 md:p-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{exam.title}</h1>
                        <p className="text-blue-100">ID: {exam.id}</p>
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 space-y-8">
                        {/* Status Alert */}
                        {isUpcoming && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-amber-900">
                                    ⏰ This exam is upcoming. It will be available on{' '}
                                    <span className="font-semibold">{startsAt.toLocaleString()}</span>
                                </p>
                            </div>
                        )}

                        {isLive && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-900 font-semibold">✓ This exam is currently LIVE</p>
                            </div>
                        )}

                        {isFinished && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-slate-700">
                                    This exam ended on <span className="font-semibold">{endsAt.toLocaleString()}</span>
                                </p>
                            </div>
                        )}

                        {/* Description */}
                        {exam.shortDescription && (
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-3">Overview</h2>
                                <p className="text-slate-700 leading-relaxed">{exam.shortDescription}</p>
                            </div>
                        )}

                        {/* Instructions */}
                        {exam.instructions && (
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-3">Instructions</h2>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{exam.instructions}</p>
                                </div>
                            </div>
                        )}

                        {/* Exam Details Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Timing Information */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Exam Schedule
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-slate-600 mb-1">Date & Time</p>
                                        <p className="text-slate-900 font-medium">{formatExamTimeRange(exam.startsAt, exam.endsAt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-600 mb-1">Total Duration</p>
                                        <p className="text-slate-900 font-medium flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            {formatDuration(exam.durationMin)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Question & Scoring Information */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-blue-600" />
                                    Scoring
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-slate-600 mb-1">Total Points</p>
                                        <p className="text-slate-900 font-medium">{exam.pointsTotal} points</p>
                                    </div>
                                    {exam.timePerQuestionSec && (
                                        <div>
                                            <p className="text-slate-600 mb-1">Time per Question</p>
                                            <p className="text-slate-900 font-medium">{formatTimePerQuestion(exam.timePerQuestionSec)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attempts Information */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-blue-600" />
                                    Attempts
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-slate-600 mb-1">Allowed Attempts</p>
                                        <p className="text-slate-900 font-medium">{exam.attemptsLeft || 1} attempt(s)</p>
                                    </div>
                                    {exam.allowedReRecords !== undefined && (
                                        <div>
                                            <p className="text-slate-600 mb-1">Re-record Limit</p>
                                            <p className="text-slate-900 font-medium">{exam.allowedReRecords} time(s)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Settings Information */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    Settings
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-slate-600">Strict Mode</p>
                                        <span className={`font-medium ${exam.strictMode ? 'text-red-600' : 'text-green-600'}`}>
                                            {exam.strictMode ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    {exam.teacherName && (
                                        <div>
                                            <p className="text-slate-600 mb-1">Instructor</p>
                                            <p className="text-slate-900 font-medium">{exam.teacherName}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Marks Breakdown */}
                        {exam.marks && Object.keys(exam.marks).length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">Question Type Breakdown</h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(exam.marks).map(([type, points]) => (
                                        <div key={type} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                                            <p className="text-sm text-blue-900 mb-1 capitalize">{type.replace('_', ' ')} Questions</p>
                                            <p className="text-2xl font-bold text-blue-700">{points} pts</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="bg-slate-50 border-t border-slate-200 p-6 md:p-8">
                        {isLive ? (
                            <button
                                onClick={() => navigate(`/student/exams/${exam.id}/take`)}
                                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                Join Exam Now
                            </button>
                        ) : isUpcoming ? (
                            <div className="w-full bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-lg text-center">
                                Exam starts at {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        ) : (
                            <div className="w-full bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-lg text-center">
                                This exam has ended
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
