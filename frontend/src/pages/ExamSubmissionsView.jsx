import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Download } from 'lucide-react'
import { fetchExamResults } from '../services/api'

/**
 * ExamSubmissionsView - Page for teachers to view all student submissions for an exam
 */
export default function ExamSubmissionsView() {
    const { examId } = useParams()
    const navigate = useNavigate()
    const [submissions, setSubmissions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [expandedAnswers, setExpandedAnswers] = useState({})

    // Load submissions
    useEffect(() => {
        const loadSubmissions = async () => {
            try {
                setLoading(true)
                const data = await fetchExamResults(examId)
                setSubmissions(data)
            } catch (err) {
                console.error('Error loading submissions:', err)
                setError(err?.message || 'Failed to load submissions')
            } finally {
                setLoading(false)
            }
        }

        loadSubmissions()
    }, [examId])

    const toggleAnswer = (submissionIndex, answerIndex) => {
        const key = `${submissionIndex}-${answerIndex}`
        setExpandedAnswers(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    const toggleSubmission = (index) => {
        setSelectedSubmission(selectedSubmission === index ? null : index)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading submissions...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <button
                    onClick={() => navigate('/faculty/exams')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Exams
                </button>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Submissions</h2>
                    <p className="text-red-700">{error}</p>
                </div>
            </div>
        )
    }

    if (!submissions || !submissions.exam) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <button
                    onClick={() => navigate('/faculty/exams')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Exams
                </button>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-yellow-900 mb-2">Exam Not Found</h2>
                    <p className="text-yellow-700">The exam you're looking for doesn't exist.</p>
                </div>
            </div>
        )
    }

    const exam = submissions.exam
    const attempts = submissions.attempts || []

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <button
                onClick={() => navigate('/faculty/exams')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Exams
            </button>

            {/* Exam Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
                <p className="text-gray-600 mb-4">Exam Code: <span className="font-mono font-semibold">{exam.examCode}</span></p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                        <p className="text-2xl font-bold text-blue-600">{attempts.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Completed</p>
                        <p className="text-2xl font-bold text-green-600">
                            {attempts.filter(a => a.status === 'submitted' || a.status === 'evaluated').length}
                        </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Average Score</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {attempts.length > 0
                                ? (attempts.reduce((sum, a) => sum + (a.totalScore || 0), 0) / attempts.length).toFixed(1)
                                : 'N/A'
                            }
                        </p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Max Score</p>
                        <p className="text-2xl font-bold text-gray-700">{exam.pointsTotal || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Student Submissions</h2>

                {attempts.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <p className="text-gray-500 text-lg">No submissions yet</p>
                    </div>
                ) : (
                    attempts.map((submission, index) => (
                        <div key={submission.attemptId} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
                            {/* Submission Header */}
                            <button
                                onClick={() => toggleSubmission(index)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="text-left flex-1">
                                    <h3 className="font-semibold text-gray-900">
                                        {submission.student?.username || 'Unknown Student'}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {submission.student?.email || 'No email'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-6 mr-4">
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-blue-600">
                                            {submission.totalScore || 0}/{submission.maxScore || 0}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            {submission.maxScore ? ((submission.totalScore / submission.maxScore) * 100).toFixed(1) : 0}%
                                        </p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${submission.status === 'submitted'
                                        ? 'bg-blue-100 text-blue-700'
                                        : submission.status === 'evaluated'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {submission.status}
                                    </div>
                                </div>

                                <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${selectedSubmission === index ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </button>

                            {/* Submission Details */}
                            {selectedSubmission === index && (
                                <div className="border-t border-gray-200 bg-gray-50 p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Started At</p>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {new Date(submission.startedAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Finished At</p>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {submission.finishedAt ? new Date(submission.finishedAt).toLocaleString() : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Duration</p>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {submission.startedAt && submission.finishedAt
                                                    ? `${Math.round((new Date(submission.finishedAt) - new Date(submission.startedAt)) / 60000)} min`
                                                    : 'N/A'
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Total Questions</p>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {submission.answers?.length || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Answers */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 mb-4">Student Answers</h4>
                                        {submission.answers && submission.answers.length > 0 ? (
                                            submission.answers.map((answer, answerIndex) => (
                                                <div key={answerIndex} className="bg-white rounded border border-gray-200 overflow-hidden">
                                                    <button
                                                        onClick={() => toggleAnswer(index, answerIndex)}
                                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="text-left flex-1">
                                                            <p className="font-semibold text-gray-900 mb-1">
                                                                Q{answer.order || answerIndex + 1}: {answer.text || 'Untitled Question'}
                                                            </p>
                                                            <p className="text-xs text-gray-600">
                                                                Score: <span className="font-semibold">{answer.score || 0}/{answer.maxMarks || 0}</span>
                                                            </p>
                                                        </div>
                                                        <svg
                                                            className={`w-4 h-4 text-gray-400 transition-transform ${expandedAnswers[`${index}-${answerIndex}`] ? 'rotate-180' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                        </svg>
                                                    </button>

                                                    {expandedAnswers[`${index}-${answerIndex}`] && (
                                                        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-600 mb-2">STUDENT ANSWER</p>
                                                                <div className="bg-white p-3 rounded border border-gray-200 text-gray-900 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                                                                    {answer.answerText || '(No answer provided)'}
                                                                </div>
                                                            </div>

                                                            {answer.feedback && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-gray-600 mb-2">AI FEEDBACK</p>
                                                                    <div className="bg-blue-50 p-3 rounded border border-blue-200 text-gray-900 text-sm whitespace-pre-wrap break-words">
                                                                        {answer.feedback}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-xs text-gray-600 mb-1">Score</p>
                                                                    <p className="font-bold text-lg text-blue-600">
                                                                        {answer.score || 0}/{answer.maxMarks || 0}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600 mb-1">Evaluated At</p>
                                                                    <p className="text-sm font-semibold text-gray-900">
                                                                        {answer.evaluatedAt ? new Date(answer.evaluatedAt).toLocaleString() : 'Not evaluated'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-600 text-sm">No answers recorded</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
