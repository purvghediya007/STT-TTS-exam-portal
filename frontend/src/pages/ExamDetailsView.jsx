import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Award, Users, AlertCircle, Zap, Shield, Info, ChevronRight, FileText, CheckCircle } from 'lucide-react'
import { getExamSummary } from '../services/api'
import { formatExamTimeRange, formatDuration, formatTimePerQuestion } from '../utils/format'

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
        if (examId) loadExam()
    }, [examId])

    if (loading) {
        return (
            <div className="min-h-screen bg-blue-50/30 flex items-center justify-center p-6">
                <div className="max-w-4xl w-full animate-pulse">
                    <div className="h-8 bg-blue-100 rounded-lg w-32 mb-6"></div>
                    <div className="bg-white h-[500px] rounded-3xl shadow-sm border border-blue-100"></div>
                </div>
            </div>
        )
    }

    if (error || !exam) {
        return (
            <div className="min-h-screen bg-blue-50/50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border border-blue-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Access Error</h3>
                    <p className="text-slate-500 mb-6">{error || 'The requested exam could not be located.'}</p>
                    <button onClick={() => navigate(-1)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all">Go Back</button>
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
        <div className="min-h-screen bg-[#F0F7FF] pb-12 font-sans">
            {/* Subtle Top Decor */}
            <div className="h-2 bg-blue-500 w-full" />
            
            <div className="max-w-6xl mx-auto px-4 pt-6">
                {/* Clean Back Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors mb-6 font-semibold text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    BACK TO DASHBOARD
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN: Main Info */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                            {/* Header Section */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-white">
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/30">
                                        Examination
                                    </span>
                                    {isLive && (
                                        <span className="flex items-center gap-1 px-3 py-1 bg-green-400 text-green-900 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                            <span className="w-1.5 h-1.5 bg-green-900 rounded-full animate-ping" /> Live Now
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">{exam.title}</h1>
                                <p className="text-blue-100 text-sm font-medium opacity-90 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Assessment ID: {exam.id}
                                </p>
                            </div>

                            <div className="p-6 md:p-8">
                                {/* Status Alerts */}
                                {isUpcoming && (
                                    <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-blue-500" />
                                            <p className="text-sm text-blue-800">
                                                Scheduled for <span className="font-bold">{startsAt.toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isFinished && (
                                    <div className="mb-6 bg-slate-50 border-l-4 border-slate-400 p-4 rounded-r-xl">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-slate-500" />
                                            <p className="text-sm text-slate-600 italic">This session ended on {endsAt.toLocaleString()}.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Main Description Section */}
                                <div className="space-y-8">
                                    {exam.shortDescription && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Overview</h2>
                                            </div>
                                            <p className="text-slate-700 leading-relaxed text-lg font-medium">{exam.shortDescription}</p>
                                        </section>
                                    )}

                                    {exam.instructions && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Student Instructions</h2>
                                            </div>
                                            <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 text-slate-600 leading-relaxed whitespace-pre-wrap text-sm shadow-inner">
                                                {exam.instructions}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Marks Breakdown Grid */}
                        {exam.marks && Object.keys(exam.marks).length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-blue-900/40 uppercase tracking-[0.2em] mb-4 ml-2">Question Distribution</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {Object.entries(exam.marks).map(([type, points]) => (
                                        <div key={type} className="bg-white p-5 rounded-2xl border border-blue-50 shadow-sm transition-all hover:shadow-md">
                                            <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">{type.replace('_', ' ')}</p>
                                            <p className="text-2xl font-black text-slate-800">{points}<span className="text-xs font-bold text-slate-400 ml-1">PTS</span></p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDEBAR: Sidebar Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
                            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
                                <Info className="w-4 h-4 text-blue-500" />
                                Exam Details
                            </h3>
                            
                            <div className="space-y-5">
                                <SidebarItem 
                                    icon={<Calendar className="w-4 h-4" />} 
                                    label="Session Date" 
                                    value={formatExamTimeRange(exam.startsAt, exam.endsAt)} 
                                />
                                <SidebarItem 
                                    icon={<Clock className="w-4 h-4" />} 
                                    label="Limit" 
                                    value={formatDuration(exam.durationMin)} 
                                />
                                <SidebarItem 
                                    icon={<Award className="w-4 h-4" />} 
                                    label="Max Score" 
                                    value={`${exam.pointsTotal} Points`} 
                                />
                                {exam.timePerQuestionSec && (
                                    <SidebarItem 
                                        icon={<Zap className="w-4 h-4" />} 
                                        label="Average Pace" 
                                        value={`${formatTimePerQuestion(exam.timePerQuestionSec)} / Question`} 
                                    />
                                )}

                                <div className="pt-4 mt-2 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-medium uppercase">Attempts Allowed</span>
                                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{exam.attemptsLeft || 1}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-medium uppercase">Monitoring</span>
                                        <span className={`font-bold flex items-center gap-1 ${exam.strictMode ? 'text-blue-600' : 'text-slate-500'}`}>
                                            <Shield className="w-3 h-3" />
                                            {exam.strictMode ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    {exam.teacherName && (
                                        <div className="pt-3 border-t border-slate-50">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Assigned By</p>
                                            <p className="text-sm font-bold text-blue-600">{exam.teacherName}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="mt-8">
                                {isLive ? (
                                    <button
                                        onClick={() => navigate(`/student/exams/${exam.id}/take`)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 group"
                                    >
                                        Start Examination
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : (
                                    <div className="w-full bg-slate-100 text-slate-500 font-bold py-4 px-6 rounded-xl text-center border border-slate-200 text-sm">
                                        {isUpcoming ? 'Window Not Open Yet' : 'Examination Ended'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Security Tip */}
                        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                            <div className="flex items-center gap-3 mb-2">
                                <Shield className="w-5 h-5 text-blue-200" />
                                <h4 className="font-bold">Privacy Note</h4>
                            </div>
                            <p className="text-xs text-blue-100 leading-relaxed opacity-80">
                                Ensure your camera and microphone are functional if this exam requires strict monitoring. Tab switching may be logged.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

// Helper Component for Sidebar Items to keep code clean
function SidebarItem({ icon, label, value }) {
    return (
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{label}</p>
                <p className="text-sm font-extrabold text-slate-700 leading-none">{value}</p>
            </div>
        </div>
    )
}