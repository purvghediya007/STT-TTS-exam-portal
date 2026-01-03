import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Download, Search, User, Mail, Clock, CheckCircle, ChevronDown, Monitor, GraduationCap, Calendar } from 'lucide-react'
import { fetchExamResults } from '../services/api'

/**
 * ExamSubmissionsView - Enhanced Responsive Page for faculty to review student results
 */
export default function ExamSubmissionsView() {
    const { examId } = useParams()
    const navigate = useNavigate()
    const [submissions, setSubmissions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [expandedAnswers, setExpandedAnswers] = useState({})
    const [searchTerm, setSearchTerm] = useState('')

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

        if (examId) {
            loadSubmissions()
        }
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

    const exportToCSV = () => {
        if (!submissions || !submissions.attempts) return;
        
        const headers = ["Student Name", "Email", "Score", "Max Score", "Percentage", "Status", "Duration (min)"];
        const rows = submissions.attempts.map(sub => {
            const duration = sub.startedAt && sub.finishedAt 
                ? Math.round((new Date(sub.finishedAt) - new Date(sub.startedAt)) / 60000) 
                : 'N/A';
            const percentage = sub.maxScore ? ((sub.totalScore / sub.maxScore) * 100).toFixed(1) : 0;
            
            return [
                sub.student?.username || 'Unknown',
                sub.student?.email || 'N/A',
                sub.totalScore || 0,
                sub.maxScore || 0,
                `${percentage}%`,
                sub.status,
                duration
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers, ...rows].map(e => {
                const row = e.map(field => `"${field}"`);
                return row.join(",");
            }).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `results_${submissions.exam.examCode}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                    <GraduationCap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 w-8 h-8" />
                </div>
                <h2 className="mt-6 text-xl font-semibold text-slate-800">Compiling Results</h2>
                <p className="text-slate-500 mt-2">Please wait while we fetch student submissions...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8">
                <button onClick={() => navigate('/faculty/exams')} className="flex items-center gap-2 text-blue-600 font-medium mb-8 hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                <div className="max-w-xl mx-auto bg-white border border-red-100 rounded-3xl p-8 md:p-12 text-center shadow-xl shadow-red-500/5">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Fetch Failed</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">{error}</p>
                    <button onClick={() => window.location.reload()} className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95">
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    const exam = submissions.exam
    const attempts = (submissions.attempts || []).filter(a => 
        a.student?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.student?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-600 to-indigo-700 -z-10 opacity-[0.03]"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl -z-10"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                {/* Navigation */}
                <button
                    onClick={() => navigate('/faculty/exams')}
                    className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-8 font-medium transition-all"
                >
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-50 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span>Return to Exam List</span>
                </button>

                {/* Header Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-6 md:p-10 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[5rem] -z-10"></div>
                    
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wider">
                                    {exam.examCode}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-400 text-sm italic">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Results Portal
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-2">
                                {exam.title}
                            </h1>
                            <p className="text-slate-500 max-w-2xl">
                                Detailed analysis and individual student responses for the selected examination. 
                                Use the export tool for offline grading or record keeping.
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={exportToCSV}
                                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 font-bold text-sm"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Submissions', value: submissions.attempts?.length || 0, color: 'blue', icon: User },
                            { label: 'Evaluated', value: submissions.attempts?.filter(a => a.status === 'evaluated').length || 0, color: 'green', icon: CheckCircle },
                            { label: 'Avg. Score', value: submissions.attempts?.length > 0 ? (submissions.attempts.reduce((sum, a) => sum + (a.totalScore || 0), 0) / submissions.attempts.length).toFixed(1) : '0.0', color: 'purple', icon: Monitor },
                            { label: 'Max Points', value: exam.pointsTotal || 0, color: 'orange', icon: AlertCircle }
                        ].map((stat, i) => (
                            <div key={i} className={`p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg bg-${stat.color}-100 text-${stat.color}-600`}>
                                        <stat.icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                </div>
                                <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="sticky top-4 z-20 mb-8">
                    <div className="relative group max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Find a student by name or email address..."
                            className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Submissions Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            Recent Attempts
                            <span className="text-sm font-medium text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md">{attempts.length}</span>
                        </h2>
                    </div>

                    {attempts.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">No matches found</h3>
                            <p className="text-slate-500">We couldn't find any submissions matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        attempts.map((submission, index) => (
                            <div 
                                key={submission.attemptId || index} 
                                className={`bg-white rounded-3xl border transition-all duration-300 ${selectedSubmission === index ? 'border-blue-200 shadow-xl shadow-blue-500/5 ring-1 ring-blue-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
                            >
                                {/* Row Trigger */}
                                <button
                                    onClick={() => toggleSubmission(index)}
                                    className={`w-full p-4 md:p-6 text-left flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${selectedSubmission === index ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-xl shadow-inner">
                                            {submission.student?.username?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 text-lg md:text-xl leading-none mb-1.5 uppercase tracking-tight">
                                                {submission.student?.username || 'Unknown Student'}
                                            </h3>
                                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-[150px] sm:max-w-xs">{submission.student?.email || 'No email'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                                        <div className="text-left md:text-right min-w-[100px]">
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Final Score</p>
                                            <p className="font-black text-2xl text-blue-600 flex items-baseline gap-1">
                                                {submission.totalScore || 0}
                                                <span className="text-slate-300 font-medium text-sm">/ {submission.maxScore || 0}</span>
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className={`hidden sm:block px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                                                submission.status === 'evaluated' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                                {submission.status}
                                            </div>
                                            <div className={`p-2 rounded-full transition-transform duration-300 ${selectedSubmission === index ? 'rotate-180 bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <ChevronDown className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded View */}
                                {selectedSubmission === index && (
                                    <div className="border-t border-slate-100 p-4 md:p-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {/* Metadata Cards */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10">
                                            {[
                                                { icon: Clock, label: 'Started At', value: submission.startedAt ? new Date(submission.startedAt).toLocaleTimeString() : 'N/A' },
                                                { icon: CheckCircle, label: 'Finished At', value: submission.finishedAt ? new Date(submission.finishedAt).toLocaleTimeString() : 'N/A' },
                                                { icon: Monitor, label: 'Time Used', value: submission.startedAt && submission.finishedAt ? `${Math.round((new Date(submission.finishedAt) - new Date(submission.startedAt)) / 60000)}m` : 'N/A' },
                                                { icon: GraduationCap, label: 'Performance', value: `${submission.maxScore ? ((submission.totalScore / submission.maxScore) * 100).toFixed(1) : 0}%`, highlight: true }
                                            ].map((meta, i) => (
                                                <div key={i} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-1 text-slate-400">
                                                        <meta.icon className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{meta.label}</span>
                                                    </div>
                                                    <p className={`text-sm md:text-base font-bold ${meta.highlight ? 'text-blue-600' : 'text-slate-800'}`}>
                                                        {meta.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Questions Flow */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 mb-6">
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Responses Detail</h4>
                                                <div className="h-px flex-1 bg-slate-100"></div>
                                            </div>
                                            
                                            {submission.answers && submission.answers.length > 0 ? (
                                                submission.answers.map((answer, answerIndex) => {
                                                    const isExpanded = expandedAnswers[`${index}-${answerIndex}`];
                                                    return (
                                                        <div key={answerIndex} className={`group rounded-2xl border-2 transition-all ${isExpanded ? 'border-blue-100 bg-white shadow-lg' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'}`}>
                                                            <button
                                                                onClick={() => toggleAnswer(index, answerIndex)}
                                                                className="w-full px-5 py-4 flex items-center justify-between text-left"
                                                            >
                                                                <div className="flex-1 pr-4">
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600">
                                                                            {answer.order || answerIndex + 1}
                                                                        </span>
                                                                        <p className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                                            {answer.text || 'Question Content Unavailable'}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-10">
                                                                        Marks: <span className={answer.score > 0 ? 'text-green-600' : 'text-slate-600'}>{answer.score || 0}</span> / {answer.maxMarks || 0}
                                                                    </p>
                                                                </div>
                                                                <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>
                                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                </div>
                                                            </button>

                                                            {isExpanded && (
                                                                <div className="px-5 pb-6 pt-2 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                    <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-inner">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Student Answer</p>
                                                                        <div className="text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                                                                            {answer.type === 'mcq' 
                                                                                ? (answer.selectedOptionIndex !== null && answer.options?.[answer.selectedOptionIndex] 
                                                                                    ? <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100">
                                                                                        <CheckCircle className="w-4 h-4" /> {answer.options[answer.selectedOptionIndex].text}
                                                                                      </span>
                                                                                    : <span className="italic text-slate-400">No option selected</span>)
                                                                                : (answer.answerText || <span className="italic text-slate-400">No text provided</span>)
                                                                            }
                                                                        </div>
                                                                    </div>

                                                                    {answer.feedback && (
                                                                        <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 relative">
                                                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Automated Feedback</p>
                                                                            <p className="text-indigo-900 text-sm leading-relaxed italic">
                                                                                "{answer.feedback}"
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                            {answer.evaluatedAt ? `Processed: ${new Date(answer.evaluatedAt).toLocaleDateString()}` : 'Evaluation Pending'}
                                                                        </span>
                                                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                                                            <span className="text-xs font-black text-slate-400 uppercase">Points Awarded:</span>
                                                                            <span className="px-4 py-1.5 bg-slate-900 text-white text-sm font-black rounded-xl">
                                                                                {answer.score || 0} pts
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dotted border-slate-200">
                                                    <p className="text-slate-400 font-medium">Attempt summary only. No per-question breakdown available.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}