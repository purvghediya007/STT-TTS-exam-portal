import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    AlertCircle,
    Download,
    Search,
    User,
    Mail,
    Clock,
    CheckCircle,
    ChevronDown,
    Monitor,
    GraduationCap,
    Calendar,
    Edit2,
    Save,
    X,
    Loader,
    Award,
    Sparkles,
    Share2,
    Globe,
    HelpCircle,
    Check,
    AlertTriangle,
    FileText,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Headphones,
    ExternalLink
} from 'lucide-react'
import { fetchExamResults, updateAnswerScore, awardQuestionBonusMarks, publishExamResults } from '../services/api'
import logger from '../utils/logger'

/**
 * AudioAnswerPlayer - Audio player for student voice answers
 * - Strictly deduplicates audio takes so it never shows duplicate takes
 * - Stops playback when another audio element begins playing
 * - Provides playback rate controls (1x, 1.25x, 1.5x, 2x), seeking, mute, and direct download
 */
function AudioAnswerPlayer({ recordings, answerId, activeGlobalAudioId, onPlayAudio }) {
    // 1. Strictly deduplicate recordings and filter out empty strings
    const uniqueUrls = useMemo(() => {
        if (!recordings) return [];
        const raw = Array.isArray(recordings) ? recordings : [recordings];
        return Array.from(new Set(raw.filter(u => typeof u === 'string' && u.trim().length > 0)));
    }, [recordings]);

    if (uniqueUrls.length === 0) return null;

    const [selectedTakeIndex, setSelectedTakeIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const audioRef = useRef(null);

    const activeUrl = uniqueUrls[selectedTakeIndex] || uniqueUrls[0];
    const resolvedUrl = useMemo(() => {
        if (!activeUrl) return '';
        if (activeUrl.startsWith('http://') || activeUrl.startsWith('https://') || activeUrl.startsWith('blob:')) {
            return activeUrl;
        }
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return `${apiBase.replace(/\/api\/?$/, '')}${activeUrl.startsWith('/') ? '' : '/'}${activeUrl}`;
    }, [activeUrl]);

    const playerKey = `${answerId}-${selectedTakeIndex}`;

    // Stop playing if another audio starts anywhere on the page
    useEffect(() => {
        if (activeGlobalAudioId && activeGlobalAudioId !== playerKey && isPlaying) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setIsPlaying(false);
        }
    }, [activeGlobalAudioId, playerKey, isPlaying]);

    // Handle Take switch
    const handleSwitchTake = (index) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setLoadError(null);
        setSelectedTakeIndex(index);
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            onPlayAudio(playerKey);
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(err => {
                logger.error('Audio playback error:', err);
                setLoadError('Playback error. Click raw link below.');
                setIsPlaying(false);
            });
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const cyclePlaybackRate = () => {
        const rates = [1, 1.25, 1.5, 2];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const newRate = rates[nextIdx];
        setPlaybackRate(newRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = newRate;
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const formatAudioTime = (secs) => {
        if (!secs || isNaN(secs) || secs < 0) return '0:00';
        const minutes = Math.floor(secs / 60);
        const seconds = Math.floor(secs % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/50 rounded-2xl border border-blue-100 shadow-xs relative overflow-hidden">
            <audio
                ref={audioRef}
                src={resolvedUrl}
                preload="metadata"
                data-audio-id={playerKey}
                onPlay={() => {
                    onPlayAudio(playerKey);
                    setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                    if (audioRef.current) {
                        setCurrentTime(audioRef.current.currentTime);
                    }
                }}
                onLoadedMetadata={() => {
                    if (audioRef.current) {
                        setDuration(audioRef.current.duration || 0);
                        audioRef.current.playbackRate = playbackRate;
                    }
                }}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
                onError={() => {
                    setLoadError('Audio file could not be played directly in browser.');
                    setIsPlaying(false);
                }}
            />

            {/* Header: Title & Takes Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg shadow-xs transition-colors ${isPlaying ? 'bg-indigo-600 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
                        <Headphones className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Student Audio Recording
                        </span>
                        {uniqueUrls.length === 1 ? (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                                1 Take
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* If multiple unique takes exist, render take switcher tabs */}
                {uniqueUrls.length > 1 && (
                    <div className="flex items-center gap-1 bg-white/80 p-1 rounded-xl border border-blue-100">
                        <span className="text-[10px] font-bold text-slate-400 px-1.5">Takes:</span>
                        {uniqueUrls.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSwitchTake(idx)}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${selectedTakeIndex === idx
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-transparent text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Take {idx + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Play / Pause Circular Button */}
                <button
                    type="button"
                    onClick={togglePlay}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 flex-shrink-0 ${isPlaying
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 shadow-indigo-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                        }`}
                    title={isPlaying ? 'Pause Audio' : 'Play Student Audio'}
                >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                {/* Progress Bar & Timestamps */}
                <div className="flex-1 w-full bg-white/90 px-3.5 py-2 rounded-xl border border-blue-100/80 shadow-xs">
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min="0"
                            max={duration > 0 ? duration : 100}
                            step="0.1"
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mt-1">
                        <span className="text-blue-700 font-black">{formatAudioTime(currentTime)}</span>
                        <span>{formatAudioTime(duration)}</span>
                    </div>
                </div>

                {/* Utility Buttons: Speed, Mute, Open Raw */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                    {/* Speed Multiplier */}
                    <button
                        type="button"
                        onClick={cyclePlaybackRate}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-blue-100 rounded-xl text-xs font-black transition-colors shadow-xs"
                        title="Toggle playback speed"
                    >
                        {playbackRate}x
                    </button>

                    {/* Mute Toggle */}
                    <button
                        type="button"
                        onClick={toggleMute}
                        className={`p-2 rounded-xl border transition-colors ${isMuted
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-white hover:bg-slate-50 text-slate-600 border-blue-100'
                            }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Open / Download Direct Link */}
                    {resolvedUrl && (
                        <a
                            href={resolvedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={`student_answer_${answerId}.webm`}
                            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-blue-100 rounded-xl transition-colors shadow-xs"
                            title="Download or open raw audio in new tab"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {loadError && (
                <div className="mt-2 text-xs text-amber-800 flex items-center justify-between gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <span>{loadError}</span>
                    <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline hover:text-amber-950"
                    >
                        Open Raw Audio
                    </a>
                </div>
            )}
        </div>
    );
}

/**
 * ExamSubmissionsView - Enhanced Responsive Page for faculty to review student results & award bonus marks
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
    const [editingScore, setEditingScore] = useState(null) // { answerId, value, feedback, submissionIndex, answerIndex }
    const [savingScore, setSavingScore] = useState(false)
    const [activeGlobalAudioId, setActiveGlobalAudioId] = useState(null)

    // Bonus Marks Modal State
    const [bonusModalQuestion, setBonusModalQuestion] = useState(null) // { questionId, order, text, marks, type }
    const [bonusScore, setBonusScore] = useState(0)
    const [bonusReason, setBonusReason] = useState('')
    const [applyToSkipped, setApplyToSkipped] = useState(true)
    const [submittingBonus, setSubmittingBonus] = useState(false)

    // Publish Results State
    const [publishingResults, setPublishingResults] = useState(false)
    const [bannerNotice, setBannerNotice] = useState(null) // { type: 'success' | 'info', message: string }

    // Load submissions
    const loadSubmissions = async () => {
        try {
            setLoading(true)
            const data = await fetchExamResults(examId)
            setSubmissions(data)
        } catch (err) {
            logger.error('Error loading submissions:', err)
            setError(err?.message || 'Failed to load submissions')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
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
        // Pause any running audio when switching/collapsing student attempts
        if (selectedSubmission !== index) {
            setActiveGlobalAudioId(null);
            document.querySelectorAll('audio').forEach((el) => {
                if (!el.paused) el.pause();
            });
        }
        setSelectedSubmission(selectedSubmission === index ? null : index)
    }

    const handlePlayAudio = (audioId) => {
        // Pause all other audio elements on the document
        document.querySelectorAll('audio').forEach((el) => {
            if (el.dataset.audioId !== audioId && !el.paused) {
                el.pause();
            }
        });
        setActiveGlobalAudioId(audioId);
    };

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

    const handleEditScore = (answerId, currentScore, currentFeedback, submissionIndex, answerIndex) => {
        setEditingScore({
            answerId,
            value: currentScore != null ? currentScore : 0,
            feedback: currentFeedback || '',
            submissionIndex,
            answerIndex
        })
    }

    const handleSaveScore = async () => {
        if (!editingScore) return

        try {
            setSavingScore(true)
            const response = await updateAnswerScore(
                editingScore.answerId,
                editingScore.value,
                editingScore.feedback
            )

            // Update local state with new answer score, feedback, and attempt total score
            setSubmissions(prev => {
                const updated = { ...prev }
                const answer = updated.attempts[editingScore.submissionIndex].answers[editingScore.answerIndex]
                answer.score = editingScore.value
                answer.feedback = editingScore.feedback

                // Update attempt total score if provided
                if (response.attempt) {
                    updated.attempts[editingScore.submissionIndex].totalScore = response.attempt.totalScore
                }

                // If results were set to unpublished
                if (response.resultsPublished === false && updated.exam) {
                    updated.exam.resultsPublished = false
                    updated.exam.resultPublishedAt = null
                }

                return updated
            })

            setBannerNotice({
                type: 'info',
                message: 'Score and feedback updated successfully. Results set to Unpublished pending republication.',
            })

            setEditingScore(null)
        } catch (err) {
            logger.error('Error updating score:', err)
            alert('Failed to update score and feedback: ' + (err?.message || 'Unknown error'))
        } finally {
            setSavingScore(false)
        }
    }

    const handleCancelEdit = () => {
        setEditingScore(null)
    }

    // Open Bonus Marks Modal for a Question
    const handleOpenBonusModal = (question) => {
        setBonusModalQuestion(question)
        setBonusScore(question.marks != null ? question.marks : 5)
        setBonusReason('')
        setApplyToSkipped(true)
    }

    // Apply Bonus Marks for All Students
    const handleApplyBonus = async () => {
        if (!bonusModalQuestion) return

        const scoreNum = parseFloat(bonusScore)
        if (isNaN(scoreNum) || scoreNum < 0) {
            alert('Please enter a valid non-negative score.')
            return
        }

        if (scoreNum > bonusModalQuestion.marks) {
            alert(`Score cannot exceed question max marks (${bonusModalQuestion.marks}).`)
            return
        }

        try {
            setSubmittingBonus(true)
            const result = await awardQuestionBonusMarks(
                examId,
                bonusModalQuestion.questionId || bonusModalQuestion._id,
                {
                    score: scoreNum,
                    reason: bonusReason.trim(),
                    applyToSkipped,
                }
            )

            // Reload fresh submissions data from server
            const freshData = await fetchExamResults(examId)
            setSubmissions(freshData)

            setBannerNotice({
                type: 'info',
                message: `Awarded ${scoreNum}/${bonusModalQuestion.marks} marks for Question #${bonusModalQuestion.order || ''} to all students. Results are now Unpublished so you can review before republishing.`,
            })

            setBonusModalQuestion(null)
        } catch (err) {
            logger.error('Error applying bonus marks:', err)
            alert('Failed to award bonus marks: ' + (err?.message || 'Unknown error'))
        } finally {
            setSubmittingBonus(false)
        }
    }

    // Publish Results Handler
    const handlePublishResults = async () => {
        try {
            setPublishingResults(true)
            await publishExamResults(examId)
            setSubmissions(prev => ({
                ...prev,
                exam: {
                    ...prev.exam,
                    resultsPublished: true,
                    resultPublishedAt: new Date().toISOString(),
                }
            }))
            setBannerNotice({
                type: 'success',
                message: 'Exam results published successfully! Students can now view their scores.',
            })
        } catch (err) {
            logger.error('Error publishing results:', err)
            alert('Failed to publish results: ' + (err?.message || 'Unknown error'))
        } finally {
            setPublishingResults(false)
        }
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
    const questionsList = submissions.questions || []
    const attempts = (submissions.attempts || []).filter(a =>
        a.student?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.student?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const isPublished = exam?.resultsPublished === true
    const examEndTime = exam?.endTime || exam?.endsAt
    const hasExamEnded = examEndTime ? new Date() >= new Date(examEndTime) : true

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
                    className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-medium transition-all"
                >
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-50 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span>Return to Exam List</span>
                </button>

                {/* Banner Notification (if any) */}
                {bannerNotice && (
                    <div className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-sm animate-in fade-in duration-300 ${bannerNotice.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}>
                        <div className="flex items-start gap-3">
                            {bannerNotice.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            )}
                            <p className="text-sm font-semibold leading-relaxed">{bannerNotice.message}</p>
                        </div>
                        <button
                            onClick={() => setBannerNotice(null)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/50"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Header Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-6 md:p-10 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[5rem] -z-10"></div>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-8">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wider">
                                    {exam.examCode}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-400 text-sm italic">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Results Portal
                                </span>
                                {/* Results Published Pill */}
                                {isPublished ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                        Results Published to Students
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                        Results Unpublished (Pending)
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-2">
                                {exam.title}
                            </h1>
                            <p className="text-slate-500 max-w-2xl">
                                Review individual student submissions, award bonus marks for faulty questions, and publish final evaluations.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Publish / Republish Button */}
                            <button
                                onClick={handlePublishResults}
                                disabled={publishingResults || !hasExamEnded}
                                className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                                    !hasExamEnded
                                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                        : isPublished
                                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                                    }`}
                                title={
                                    !hasExamEnded
                                        ? 'Cannot publish results before the exam has ended'
                                        : isPublished
                                            ? 'Republish to sync any recent mark adjustments'
                                            : 'Publish results so students can view them'
                                }
                            >
                                {publishingResults ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Share2 className="w-4 h-4" />
                                )}
                                {isPublished ? 'Republish Results' : 'Publish Results to Students'}
                            </button>

                            {/* Export CSV Button */}
                            <button
                                onClick={exportToCSV}
                                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 font-bold text-sm"
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
                            <div key={i} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
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

                {/* Quick Question Bonus Manager Bar */}
                {questionsList.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Award className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Question Marks & Bonus Manager</h3>
                                    <p className="text-xs text-slate-500">Was a question flawed? Award fixed marks (e.g. 5/5 or 4/5) to all students with a reason.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                            {questionsList.map((q, idx) => (
                                <div
                                    key={q._id || idx}
                                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-200 transition-all flex flex-col justify-between"
                                >
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-black">
                                                Q{q.order || idx + 1}
                                            </span>
                                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                {q.marks || 0} pts • {q.type ? q.type.toUpperCase() : 'DESCRIPTIVE'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-700 line-clamp-2" title={q.text}>
                                            {q.text || 'Question text'}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleOpenBonusModal({
                                            questionId: q._id,
                                            order: q.order || idx + 1,
                                            text: q.text,
                                            marks: q.marks || 0,
                                            type: q.type,
                                        })}
                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-transparent rounded-xl text-xs font-black transition-all shadow-sm active:scale-95"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Award Bonus / Override
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                                            <div className={`hidden sm:block px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${submission.status === 'evaluated' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'
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
                                                                    {/* Quick Bonus Trigger for this specific question */}
                                                                    <div className="flex items-center justify-between p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                                                                        <div className="flex items-center gap-2 text-indigo-900 text-xs font-semibold">
                                                                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                                                            <span>Need to award bonus marks on this question for all students?</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleOpenBonusModal({
                                                                                questionId: answer.questionId,
                                                                                order: answer.order || answerIndex + 1,
                                                                                text: answer.text,
                                                                                marks: answer.maxMarks || 5,
                                                                                type: answer.type,
                                                                            })}
                                                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95"
                                                                        >
                                                                            <Award className="w-3.5 h-3.5" />
                                                                            Award to All
                                                                        </button>
                                                                    </div>

                                                                    {/* Student Audio Player */}
                                                                    <AudioAnswerPlayer
                                                                        recordings={answer.recordingUrls}
                                                                        answerId={answer._id || `${index}-${answerIndex}`}
                                                                        activeGlobalAudioId={activeGlobalAudioId}
                                                                        onPlayAudio={handlePlayAudio}
                                                                    />

                                                                    {answer.transcribedText && (
                                                                        <div className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-100 relative">
                                                                            <div className="flex items-center gap-2 mb-3">
                                                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Transcribed Text (from audio)</p>
                                                                                {answer.sttStatus === 'completed' && (
                                                                                    <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold text-white bg-emerald-500 rounded-full">
                                                                                        ✓ Processed
                                                                                    </span>
                                                                                )}
                                                                                {answer.sttStatus === 'failed' && (
                                                                                    <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold text-white bg-red-500 rounded-full">
                                                                                        ✕ Failed
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-emerald-900 text-sm leading-relaxed whitespace-pre-wrap">
                                                                                {answer.transcribedText}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {answer.answerText && !/^\[Audio recording:\s*https?:\/\/[^\]]+\]$/i.test(answer.answerText.trim()) && (
                                                                        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 relative">
                                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Student Response</p>
                                                                            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                                                                                {answer.answerText}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* Editable Feedback & Notes */}
                                                                    {editingScore?.answerId === answer._id ? (
                                                                        <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-200 relative animate-in fade-in duration-200">
                                                                            <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1.5">
                                                                                Edit Faculty Feedback & Remarks
                                                                            </label>
                                                                            <textarea
                                                                                rows={3}
                                                                                value={editingScore.feedback}
                                                                                onChange={(e) => setEditingScore({
                                                                                    ...editingScore,
                                                                                    feedback: e.target.value
                                                                                })}
                                                                                placeholder="Enter feedback or explanation for the awarded score..."
                                                                                className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                                                                disabled={savingScore}
                                                                            />
                                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                                {['Excellent work!', 'Partially correct explanation.', 'Need more detail.', 'Good attempt.'].map((preset, idx) => (
                                                                                    <button
                                                                                        key={idx}
                                                                                        type="button"
                                                                                        onClick={() => setEditingScore({
                                                                                            ...editingScore,
                                                                                            feedback: preset
                                                                                        })}
                                                                                        className="text-[10px] px-2.5 py-1 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors font-medium"
                                                                                    >
                                                                                        + {preset}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        answer.feedback && (
                                                                            <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 relative">
                                                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Feedback & Notes</p>
                                                                                <p className="text-indigo-900 text-sm leading-relaxed italic">
                                                                                    "{answer.feedback}"
                                                                                </p>
                                                                            </div>
                                                                        )
                                                                    )}

                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                            {answer.evaluatedAt ? `Processed: ${new Date(answer.evaluatedAt).toLocaleDateString()}` : 'Evaluation Pending'}
                                                                        </span>
                                                                        <div className="flex items-center gap-3 self-end sm:self-auto">
                                                                            <span className="text-xs font-black text-slate-400 uppercase">Points Awarded:</span>
                                                                            {editingScore?.answerId === answer._id ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        max={answer.maxMarks}
                                                                                        step="0.5"
                                                                                        value={editingScore.value}
                                                                                        onChange={(e) => setEditingScore({
                                                                                            ...editingScore,
                                                                                            value: parseFloat(e.target.value) || 0
                                                                                        })}
                                                                                        className="w-16 px-2 py-1 border border-blue-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                                        disabled={savingScore}
                                                                                    />
                                                                                    <span className="text-xs text-slate-500">/ {answer.maxMarks}</span>
                                                                                    <button
                                                                                        onClick={handleSaveScore}
                                                                                        disabled={savingScore}
                                                                                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        title="Save score and feedback"
                                                                                    >
                                                                                        {savingScore ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={handleCancelEdit}
                                                                                        disabled={savingScore}
                                                                                        className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        title="Cancel"
                                                                                    >
                                                                                        <X className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="px-4 py-1.5 bg-slate-900 text-white text-sm font-black rounded-xl">
                                                                                        {answer.score || 0} pts
                                                                                    </span>
                                                                                    <button
                                                                                        onClick={() => handleEditScore(answer._id, answer.score || 0, answer.feedback || '', index, answerIndex)}
                                                                                        className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                                                                        title="Edit marks and feedback"
                                                                                    >
                                                                                        <Edit2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
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

            {/* Bonus Marks / Fixed Score Override Modal */}
            {bonusModalQuestion && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 border border-slate-100 overflow-hidden relative">
                        {/* Close button */}
                        <button
                            onClick={() => setBonusModalQuestion(null)}
                            disabled={submittingBonus}
                            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Award Bonus Marks</h3>
                                <p className="text-xs text-slate-500">Apply fixed marks for this question to all students</p>
                            </div>
                        </div>

                        {/* Question Preview Box */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 mb-6">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-xs font-black px-2.5 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-700">
                                    Question #{bonusModalQuestion.order || 1}
                                </span>
                                <span className="text-xs font-bold text-slate-500">
                                    Max: <strong className="text-slate-900">{bonusModalQuestion.marks} Marks</strong>
                                </span>
                            </div>
                            <p className="text-sm font-medium text-slate-800 line-clamp-3">
                                {bonusModalQuestion.text || 'Question Content'}
                            </p>
                        </div>

                        {/* Form Inputs */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                    Marks to Award to Each Student *
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            max={bonusModalQuestion.marks}
                                            step="0.5"
                                            value={bonusScore}
                                            onChange={(e) => setBonusScore(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 text-lg focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                            disabled={submittingBonus}
                                            placeholder="5"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                            / {bonusModalQuestion.marks}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setBonusScore(bonusModalQuestion.marks)}
                                        className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        Full Marks
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                    Reason / Note (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={bonusReason}
                                    onChange={(e) => setBonusReason(e.target.value)}
                                    placeholder="e.g. Typo in question statement, Ambiguous options"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                    disabled={submittingBonus}
                                />
                                {/* Quick suggestion pills */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {['Typo in question', 'Ambiguous options', 'Bonus marks for all', 'Out of syllabus'].map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setBonusReason(preset)}
                                            className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors font-medium"
                                        >
                                            + {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={applyToSkipped}
                                        onChange={(e) => setApplyToSkipped(e.target.checked)}
                                        disabled={submittingBonus}
                                        className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                    />
                                    <span className="text-xs text-slate-600 leading-relaxed font-medium">
                                        Include students who skipped / did not attempt this question (Recommended for faulty questions)
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Notice Box */}
                        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 mb-6 flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-900 leading-relaxed">
                                <strong>Note:</strong> Applying bonus marks will recalculate all student total scores and automatically set Results to <strong>Unpublished</strong> so you can review before republishing.
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setBonusModalQuestion(null)}
                                disabled={submittingBonus}
                                className="px-5 py-3 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyBonus}
                                disabled={submittingBonus}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                {submittingBonus ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        <span>Applying...</span>
                                    </>
                                ) : (
                                    <>
                                        <Award className="w-4 h-4" />
                                        <span>Apply Marks to All Students</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
