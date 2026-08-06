import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { saveAnswer, saveAudio, submitPractice, updateTime } from '../services/practiceApi';
import logger from '../../utils/logger';

const QuestionStatusItem = ({ id, status, onClick, isCurrent }) => {
  let bg = 'bg-gray-400 hover:bg-gray-500';
  if (status === 'answered') bg = 'bg-green-500 hover:bg-green-600';
  if (status === 'marked_for_review') bg = 'bg-yellow-500 hover:bg-yellow-600';
  const ring = isCurrent ? 'ring-2 sm:ring-4 ring-blue-400 ring-opacity-75 shadow-lg scale-105 sm:scale-110' : '';
  const border = isCurrent ? 'border-blue-700' : 'border-gray-300';
  return (
    <button onClick={() => onClick(id)} className={`${bg} ${ring} text-white font-bold w-7 h-7 sm:w-10 sm:h-10 text-xs sm:text-base rounded flex items-center justify-center transition duration-200 ${border} border sm:border-2`}>
      {id}
    </button>
  );
};

export default function PracticeExamViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, type } = location.state || {};
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const audioStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const timeUpdateRef = useRef(null);

  const [questions, setQuestions] = useState(session?.questions || []);
  const [answers, setAnswers] = useState(session?.answers || []);
  const [currentIdx, setCurrentIdx] = useState(session?.currentIndex || 0);
  const [remainingTime, setRemainingTime] = useState(session?.timeLimit || 1800);
  const [isRecording, setIsRecording] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [localAudioURL, setLocalAudioURL] = useState(null);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [evalError, setEvalError] = useState(null); // Added for tracking evaluation errors


  const sessionId = session?.sessionId;
  const maxReRecords = session?.maxReRecords || 2;
  const isSpoken = type === 'technical_spoken';
  const currentQ = questions[currentIdx];
  const currentAns = answers[currentIdx];
  const totalQ = questions.length;
  const totalMarks = questions.reduce((s, q) => s + (q.marks || 1), 0);
  const answeredCount = answers.filter(a => a.status === 'answered').length;
  const reviewCount = answers.filter(a => a.status === 'marked_for_review').length;
  const progressPercent = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;

  // Redirect if no session
  useEffect(() => {
    if (!session) navigate('/student/practice');
  }, [session]);

  // Timer — stops when submitting
  useEffect(() => {
    if (remainingTime <= 0 && !isSubmitting) {
      handleSubmit();
      return;
    }
    if (isSubmitting) return; // Don't tick while submitting
    const timer = setInterval(() => setRemainingTime(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [remainingTime, isSubmitting]);

  // Sync time to server every 30s
  useEffect(() => {
    timeUpdateRef.current = setInterval(() => {
      if (sessionId) updateTime({ sessionId, remainingTime }).catch(() => {});
    }, 30000);
    return () => clearInterval(timeUpdateRef.current);
  }, [remainingTime, sessionId]);

  // Tab switch warning
  useEffect(() => {
    const handler = () => {
      if (document.hidden) setShowTabWarning(true);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // MCQ selection
  const handleMCQSelect = (optIdx) => {
    const newAnswers = [...answers];
    const wasSelected = newAnswers[currentIdx].selectedOption === optIdx;
    newAnswers[currentIdx].selectedOption = wasSelected ? null : optIdx;
    newAnswers[currentIdx].status = wasSelected ? 'not_answered' : 'answered';
    setAnswers(newAnswers);
    // Save immediately
    saveAnswer({ sessionId, questionId: currentQ._id, selectedOption: newAnswers[currentIdx].selectedOption, status: newAnswers[currentIdx].status, currentIndex: currentIdx }).catch(() => {});
  };

  // Mark for review
  const toggleReview = () => {
    const newAnswers = [...answers];
    newAnswers[currentIdx].status = newAnswers[currentIdx].status === 'marked_for_review' ? (newAnswers[currentIdx].selectedOption !== null || newAnswers[currentIdx].audioData ? 'answered' : 'not_answered') : 'marked_for_review';
    setAnswers(newAnswers);
    saveAnswer({ sessionId, questionId: currentQ._id, selectedOption: newAnswers[currentIdx].selectedOption, status: newAnswers[currentIdx].status, currentIndex: currentIdx }).catch(() => {});
  };

  // Navigation — saves audio on Next for spoken mode
  const handleNav = async (newIdx) => {
    // If spoken and has recording, save audio on navigation
    if (isSpoken && localAudioURL && currentAns) {
      try {
        const resp = await fetch(localAudioURL);
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          saveAudio({ sessionId, questionId: currentQ._id, audioData: base64, transcript, currentIndex: newIdx }).catch(() => {});
          const newAnswers = [...answers];
          newAnswers[currentIdx].audioData = base64;
          newAnswers[currentIdx].transcript = transcript;
          newAnswers[currentIdx].status = 'answered';
          setAnswers(newAnswers);
        };
        reader.readAsDataURL(blob);
      } catch (e) { logger.error('Audio save error:', e); }
    }
    stopRecording();
    setLocalAudioURL(null);
    setTranscript('');
    setCurrentIdx(newIdx);
  };

  // Audio recording with Web Speech API transcription
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      recordedChunks.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setLocalAudioURL(url);
        stream.getTracks().forEach(t => t.stop());
        setIsStreamActive(false);
        setIsRecording(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsStreamActive(true);

      // Start speech recognition for live transcript
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        let finalTranscript = '';
        recognition.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
            else interim += e.results[i][0].transcript;
          }
          setTranscript(finalTranscript + interim);
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      alert('Microphone error: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    setIsStreamActive(false);
  };

  // TTS
  const listenQuestion = () => {
    if (isPlaying) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    if (window.speechSynthesis && currentQ?.question) {
      const u = new SpeechSynthesisUtterance(currentQ.question);
      u.rate = 1; u.pitch = 1;
      u.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(u);
      setIsPlaying(true);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setEvalError(null); // Clear previous error
    setShowSubmitModal(false);
    // Save current spoken answer if exists
    if (isSpoken && localAudioURL) {
      try {
        const resp = await fetch(localAudioURL);
        const blob = await resp.blob();
        const base64 = await new Promise((resolve) => {
          const r = new FileReader(); r.onloadend = () => resolve(r.result); r.readAsDataURL(blob);
        });
        await saveAudio({ sessionId, questionId: currentQ._id, audioData: base64, transcript, currentIndex: currentIdx });
      } catch (e) {}
    }
    try {
      const result = await submitPractice({ sessionId });
      if (result.success) {
        navigate('/student/practice/results', { state: { results: result.data } });
      }
    } catch (e) {
      logger.error("AI Evaluation submission failed:", e);
      const errMsg = e.response?.data?.message || e.message || 'AI Evaluation failed';
      setEvalError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!session || !currentQ) return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-0 w-full">
      {/* Tab Warning */}
      {showTabWarning && (
        <div className="fixed top-20 left-0 right-0 z-30 flex justify-center">
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 p-3 rounded-md shadow-md max-w-3xl mx-4 flex items-center justify-between">
            <span className="text-sm">⚠️ You switched away from the practice window. Stay focused!</span>
            <button onClick={() => setShowTabWarning(false)} className="ml-4 font-bold px-3 py-1 rounded hover:bg-yellow-100">×</button>
          </div>
        </div>
      )}

      {/* Full-Screen Submitting Overlay — blocks all interaction */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-[100]">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Evaluating Your Answers</h2>
            <p className="text-gray-500 text-sm mb-1">Please wait while we process your responses...</p>
            <p className="text-gray-400 text-xs">This may take a moment for spoken answers</p>
            <div className="mt-6 flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'0s'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'0.15s'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'0.3s'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8">
            <h3 className="text-2xl font-bold text-blue-700 mb-4 border-b pb-2">Confirm Submission</h3>
            <div className="space-y-3 text-lg mb-6">
              <p className="font-semibold">Total Questions: <span className="float-right">{totalQ}</span></p>
              <p className="text-green-600">✅ Answered: <span className="float-right font-bold">{answeredCount}</span></p>
              <p className="text-yellow-600">🚩 Review: <span className="float-right font-bold">{reviewCount}</span></p>
              <p className="text-red-600">❌ Not Answered: <span className="float-right font-bold">{totalQ - answeredCount - reviewCount}</span></p>
            </div>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setShowSubmitModal(false)} className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400">Review</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Final Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white shadow-md rounded-lg p-2 sm:p-3 lg:p-4 mb-3 sm:mb-4 border-b-2 border-blue-500">
        <div className="flex justify-between items-center">
          <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-blue-700 truncate">Practice Viewer</h1>
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-500">Time</p>
              <p className={`text-sm sm:text-lg lg:text-2xl font-bold ${remainingTime <= 300 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>{formatTime(remainingTime)}</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Marks</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{totalMarks}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Progress</p>
              <div className="w-24 lg:w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[10px] lg:text-xs text-center text-gray-600 mt-0.5">{progressPercent}%</p>
            </div>
            {isSpoken && <div className="text-[10px] sm:text-xs text-green-600 font-semibold">Mic</div>}
          </div>
        </div>
        {/* Mobile progress bar */}
        <div className="mt-2 md:hidden">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">{answeredCount}/{totalQ} answered · {progressPercent}%</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 p-2 sm:p-4 lg:p-6 min-h-screen">
        {/* Question Area */}
        <div className="lg:w-3/4 w-full bg-white p-3 sm:p-5 lg:p-8 rounded-xl shadow-lg border border-blue-100">
          <header className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-sm sm:text-lg font-semibold text-gray-700">Q {currentIdx + 1}/{totalQ}</h2>
              <span className="text-sm sm:text-xl font-bold text-green-600">Marks: {currentQ.marks || 1}</span>
            </div>
          </header>

          {/* Question Text + Listen */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-6 bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm">
            <p className="text-base sm:text-xl font-semibold text-gray-800 leading-relaxed mb-3 sm:mb-4">{currentQ.question}</p>
            <button onClick={listenQuestion} className={`inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs sm:text-sm font-bold rounded-full shadow-md transition-all`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 4.5 4.5 0 0 1 0 6.364.75.75 0 0 1-1.06-1.06 3 3 0 0 0 0-4.242.75.75 0 0 1 0-1.062Z" />
              </svg>
              {isPlaying ? 'Stop' : 'Listen'}
            </button>
          </div>

          {/* Answer Area */}
          <div className="mt-4 sm:mt-8 p-2 sm:p-4 border-t pt-4 sm:pt-6">
            {/* MCQ Options */}
            {!isSpoken && currentQ.options && (
              <div className="space-y-3">
                {currentQ.options.map((opt, idx) => (
                  <div key={idx} onClick={() => handleMCQSelect(idx)}
                    className={`p-3 border rounded-lg cursor-pointer transition duration-150 ${currentAns?.selectedOption === idx ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500 font-semibold' : 'bg-white hover:bg-gray-50 border-gray-300'}`}>
                    <span className="font-mono text-sm mr-3 text-blue-600">{String.fromCharCode(65 + idx)}.</span>
                    <span className="text-gray-800">{opt.text}</span>
                    {currentAns?.selectedOption === idx && <span className="float-right text-blue-600">Selected</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Spoken Recording Area */}
            {isSpoken && (
              <div className="space-y-4">
                <div className={`flex justify-center items-center h-48 rounded-lg overflow-hidden relative border-4 border-dashed transition duration-500 ${isStreamActive ? 'bg-red-50 border-red-400' : 'bg-gray-200 border-gray-400'}`}>
                  {isStreamActive && (
                    <div className="text-center p-4">
                      <div className="flex items-center justify-center space-x-1 h-16">
                        <div className="w-2 h-8 bg-red-500 rounded-full animate-pulse" style={{animationDelay:'0.1s'}}></div>
                        <div className="w-2 h-12 bg-red-600 rounded-full animate-pulse" style={{animationDelay:'0.2s'}}></div>
                        <div className="w-2 h-16 bg-red-700 rounded-full animate-pulse" style={{animationDelay:'0.3s'}}></div>
                        <div className="w-2 h-12 bg-red-600 rounded-full animate-pulse" style={{animationDelay:'0.4s'}}></div>
                        <div className="w-2 h-8 bg-red-500 rounded-full animate-pulse" style={{animationDelay:'0.5s'}}></div>
                      </div>
                      <p className="mt-2 text-lg font-bold text-red-700">Recording Audio...</p>
                      <p className="text-sm text-red-500">Click 'Stop Recording' to save.</p>
                    </div>
                  )}
                  {localAudioURL && !isStreamActive && (
                    <div className="p-4 bg-white rounded-lg shadow-xl w-full max-w-sm">
                      <p className="text-center font-semibold text-blue-700 mb-2">Your Recording:</p>
                      <audio controls src={localAudioURL} className="w-full" />
                    </div>
                  )}
                  {!isStreamActive && !localAudioURL && (
                    <div className="text-gray-600 text-lg">Click 'Record Audio Answer' to begin.</div>
                  )}
                  {isRecording && <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold py-1 px-3 rounded-full">LIVE</div>}
                </div>

                {/* Record Buttons */}
                <div className="flex justify-center space-x-4 pt-2">
                  {!isRecording && (
                    <button onClick={startRecording} disabled={currentAns?.reRecordCount >= maxReRecords && localAudioURL}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" clipRule="evenodd" /></svg>
                      {localAudioURL ? 'Re-Record' : 'Record Audio Answer'}
                    </button>
                  )}
                  {isRecording && (
                    <button onClick={stopRecording} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5z" /></svg>
                      Stop Recording
                    </button>
                  )}
                </div>

                {/* Re-record indicator */}
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-700">
                    Re-records: {currentAns?.reRecordCount || 0} / {maxReRecords} used
                    {(currentAns?.reRecordCount || 0) >= maxReRecords && <span className="ml-2 text-red-600">(Limit reached)</span>}
                  </p>
                </div>

                {/* Live Transcript */}
                {transcript && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">Live Transcript:</p>
                    <p className="text-sm text-gray-800">{transcript}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
            <button onClick={() => handleNav(currentIdx - 1)} disabled={currentIdx === 0}
              className="px-4 sm:px-6 py-2 bg-gray-300 text-gray-800 text-sm sm:text-base font-semibold rounded-lg shadow-md hover:bg-gray-400 disabled:opacity-50 transition">← Prev</button>
            <button onClick={toggleReview}
              className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold rounded-lg shadow-md transition ${currentAns?.status === 'marked_for_review' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'}`}>
              {currentAns?.status === 'marked_for_review' ? 'Unmark' : '🚩 Review'}
            </button>
            <button onClick={() => currentIdx === totalQ - 1 ? setShowSubmitModal(true) : handleNav(currentIdx + 1)}
              className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold rounded-lg shadow-md transition ${currentIdx === totalQ - 1 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {currentIdx === totalQ - 1 ? 'Submit' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Question Panel Sidebar */}
        <div className="lg:w-1/4 w-full">
          <div className="lg:sticky lg:top-4 bg-white p-3 sm:p-5 lg:p-6 rounded-xl shadow-lg border border-blue-100">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4 border-b border-blue-100 pb-2">Question Panel</h3>
            <div className="grid grid-cols-8 sm:grid-cols-5 gap-1.5 sm:gap-3">
              {questions.map((_, idx) => (
                <QuestionStatusItem key={idx} id={idx + 1} status={answers[idx]?.status || 'not_answered'} onClick={(id) => handleNav(id - 1)} isCurrent={idx === currentIdx} />
              ))}
            </div>
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t flex sm:flex-col gap-3 sm:gap-2 text-xs sm:text-sm">
              <p className="flex items-center"><span className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full mr-1.5 sm:mr-2"></span>Answered: <span className="font-bold ml-auto">{answeredCount}</span></p>
              <p className="flex items-center"><span className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full mr-1.5 sm:mr-2"></span>Review: <span className="font-bold ml-auto">{reviewCount}</span></p>
              <p className="flex items-center"><span className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-400 rounded-full mr-1.5 sm:mr-2"></span>Unanswered: <span className="font-bold ml-auto">{totalQ - answeredCount - reviewCount}</span></p>
            </div>
          </div>
        </div>
      </div>
      {/* Evaluation Error / Retry Modal */}
      {evalError && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center border-t-4 border-red-500">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Evaluation Failed</h3>
            <p className="text-sm text-gray-600 mb-6">
              Evaluation failed. Please try again after some time.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setEvalError(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setEvalError(null);
                  handleSubmit();
                }}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-1.5"
              >
                Retry Evaluation
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} preload="auto" />
    </div>
  );
}
